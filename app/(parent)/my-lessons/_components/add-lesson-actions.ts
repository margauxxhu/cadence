'use server'

import { addDays, addWeeks, addMinutes, startOfDay } from 'date-fns'
import { toZonedTime, fromZonedTime } from 'date-fns-tz'
import { z } from 'zod'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { resend, buildAddLessonEmail } from '@/lib/resend'
import { formatLessonTime } from '@/lib/format-lesson-time'

const TZ = 'America/Los_Angeles'
const LOOK_AHEAD_WEEKS = 4
const SLOT_STEP_MINUTES = 30

export async function getAvailableSlotsForAdd(studentId: string, durationMinutes: number): Promise<{
  slots: { scheduledAt: string; displayTime: string }[]
  error?: string
}> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { slots: [], error: 'Not authenticated' }

  // Verify student belongs to this parent's family
  const { data: student } = await supabase
    .from('students')
    .select('id, family_id, families(parent_email)')
    .eq('id', studentId)
    .single()

  const family = student?.families as { parent_email: string } | null
  if (!student || family?.parent_email !== user.email) {
    return { slots: [], error: 'Unauthorized' }
  }

  const today = startOfDay(new Date())
  const horizonEnd = addWeeks(today, LOOK_AHEAD_WEEKS)
  const todayStr = today.toISOString().slice(0, 10)
  const horizonStr = horizonEnd.toISOString().slice(0, 10)

  const [{ data: periods }, { data: blackouts }, { data: existing }] = await Promise.all([
    supabase
      .from('availability_periods')
      .select('id, start_date, end_date, availability_windows(weekday, start_time, end_time), period_exceptions(exception_date)')
      .lte('start_date', horizonStr)
      .gte('end_date', todayStr),
    supabase.from('blackouts').select('start_date, end_date').lte('start_date', horizonStr).gte('end_date', todayStr),
    supabase
      .from('lessons')
      .select('scheduled_at, duration_minutes')
      .in('status', ['scheduled', 'pending'])
      .gte('scheduled_at', today.toISOString())
      .lte('scheduled_at', horizonEnd.toISOString()),
  ])

  if (!periods?.length) return { slots: [] }

  type PeriodRow = {
    id: string
    start_date: string
    end_date: string
    availability_windows: { weekday: number; start_time: string; end_time: string }[]
    period_exceptions: { exception_date: string }[]
  }

  function isBlackedOut(laDateStr: string): boolean {
    return (blackouts ?? []).some((b) => laDateStr >= b.start_date && laDateStr <= b.end_date)
  }

  function overlapsExisting(slotStart: Date): boolean {
    const slotEnd = addMinutes(slotStart, durationMinutes)
    return (existing ?? []).some((l) => {
      const lStart = new Date(l.scheduled_at)
      const lEnd = addMinutes(lStart, l.duration_minutes)
      return slotStart < lEnd && slotEnd > lStart
    })
  }

  const slots: { scheduledAt: string; displayTime: string }[] = []
  const now = new Date()
  let cursor = addDays(today, 1)

  while (cursor <= horizonEnd) {
    const laDay = toZonedTime(cursor, TZ)
    const weekday = laDay.getDay()
    const laDateStr = `${laDay.getFullYear()}-${String(laDay.getMonth() + 1).padStart(2, '0')}-${String(laDay.getDate()).padStart(2, '0')}`

    const activePeriods = (periods as PeriodRow[]).filter(
      (p) => laDateStr >= p.start_date && laDateStr <= p.end_date
    )
    const isExcepted = activePeriods.some((p) =>
      p.period_exceptions.some((e) => e.exception_date === laDateStr)
    )
    const dayWindows = activePeriods.flatMap((p) =>
      p.availability_windows.filter((w) => w.weekday === weekday)
    )

    if (!isBlackedOut(laDateStr) && !isExcepted) {
      for (const w of dayWindows) {
        const [sh, sm] = (w.start_time as string).split(':').map(Number)
        const [eh, em] = (w.end_time as string).split(':').map(Number)
        const windowEndMinutes = eh * 60 + em
        let slotMinutes = sh * 60 + sm

        while (slotMinutes + durationMinutes <= windowEndMinutes) {
          const laLocal = toZonedTime(cursor, TZ)
          laLocal.setHours(Math.floor(slotMinutes / 60), slotMinutes % 60, 0, 0)
          const slotUtc = fromZonedTime(laLocal, TZ)

          if (slotUtc > now && !overlapsExisting(slotUtc)) {
            slots.push({
              scheduledAt: slotUtc.toISOString(),
              displayTime: formatLessonTime(slotUtc, 'short'),
            })
          }
          slotMinutes += SLOT_STEP_MINUTES
        }
      }
    }
    cursor = addDays(cursor, 1)
  }

  return { slots }
}

const AddLessonSchema = z.object({
  studentId: z.string().uuid(),
  scheduledAt: z.string().datetime(),
  note: z.string(),
  durationMinutes: z.number().int().positive(),
})

export async function addLesson(
  studentId: string,
  scheduledAt: string,
  note: string,
  durationMinutes: number
): Promise<{ success?: true; isPending?: boolean; error?: string }> {
  const parsed = AddLessonSchema.safeParse({ studentId, scheduledAt, note: note.trim(), durationMinutes })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Verify ownership
  const { data: student } = await supabase
    .from('students')
    .select('id, name, family_id, families(parent_email)')
    .eq('id', parsed.data.studentId)
    .single()

  const family = student?.families as { parent_email: string } | null
  if (!student || family?.parent_email !== user.email) return { error: 'Unauthorized' }

  // Existing student = has any prior scheduled/completed lesson
  const { count } = await supabase
    .from('lessons')
    .select('id', { count: 'exact', head: true })
    .eq('student_id', parsed.data.studentId)
    .in('status', ['scheduled', 'completed', 'rescheduled'])

  const isPending = (count ?? 0) === 0

  const service = createServiceClient()
  const { error: insertErr } = await service
    .from('lessons')
    .insert({
      student_id: parsed.data.studentId,
      scheduled_at: parsed.data.scheduledAt,
      duration_minutes: parsed.data.durationMinutes,
      status: isPending ? 'pending' : 'scheduled',
      note: parsed.data.note || null,
    })

  if (insertErr) return { error: insertErr.message }

  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM ?? 'Cadence <onboarding@resend.dev>',
      to: process.env.TEACHER_EMAIL ?? '',
      subject: buildAddLessonEmail({ studentName: student.name, scheduledAt: parsed.data.scheduledAt, durationMinutes: parsed.data.durationMinutes, note: parsed.data.note, isPending }).subject,
      html: buildAddLessonEmail({ studentName: student.name, scheduledAt: parsed.data.scheduledAt, durationMinutes: parsed.data.durationMinutes, note: parsed.data.note, isPending }).html,
    })
  } catch {
    // Don't fail if email delivery fails
  }

  return { success: true, isPending }
}
