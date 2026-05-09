'use server'

import { addDays, addWeeks, addMinutes, startOfDay } from 'date-fns'
import { toZonedTime, fromZonedTime } from 'date-fns-tz'
import { z } from 'zod'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { resend, buildRescheduleEmail } from '@/lib/resend'
import { formatLessonTime } from '@/lib/format-lesson-time'

const TZ = 'America/Los_Angeles'
const LOOK_AHEAD_WEEKS = 4
const SLOT_STEP_MINUTES = 30

export async function getAvailableSlots(lessonId: string): Promise<{
  slots: { scheduledAt: string; displayTime: string }[]
  error?: string
}> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { slots: [], error: 'Not authenticated' }

  const { data: lesson } = await supabase
    .from('lessons')
    .select('id, student_id, scheduled_at, duration_minutes, status, students(family_id)')
    .eq('id', lessonId)
    .single()

  if (!lesson || lesson.status !== 'scheduled') {
    return { slots: [], error: 'Lesson not found' }
  }

  const { data: family } = await supabase
    .from('families')
    .select('id')
    .eq('parent_email', user.email!)
    .single()

  const student = lesson.students as { family_id: string } | null
  if (!family || !student || student.family_id !== family.id) {
    return { slots: [], error: 'Unauthorized' }
  }

  const duration = lesson.duration_minutes
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
      .eq('status', 'scheduled')
      .neq('id', lessonId)
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
    const slotEnd = addMinutes(slotStart, duration)
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
        while (slotMinutes + duration <= windowEndMinutes) {
          const slotHour = Math.floor(slotMinutes / 60)
          const slotMin = slotMinutes % 60
          const laLocal = toZonedTime(cursor, TZ)
          laLocal.setHours(slotHour, slotMin, 0, 0)
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

const RescheduleSchema = z.object({
  lessonId: z.string().uuid(),
  newScheduledAt: z.string().datetime(),
  note: z.string().min(1, 'Please add a note'),
})

export async function rescheduleLesson(
  lessonId: string,
  newScheduledAt: string,
  note: string
): Promise<{ success?: true; error?: string }> {
  const parsed = RescheduleSchema.safeParse({ lessonId, newScheduledAt, note: note.trim() })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: lesson } = await supabase
    .from('lessons')
    .select('id, student_id, scheduled_at, duration_minutes, status, students(name, family_id)')
    .eq('id', parsed.data.lessonId)
    .single()

  if (!lesson || lesson.status !== 'scheduled') return { error: 'Lesson not found or already cancelled' }

  const { data: family } = await supabase
    .from('families')
    .select('id')
    .eq('parent_email', user.email!)
    .single()

  const student = lesson.students as { name: string; family_id: string } | null
  if (!family || !student || student.family_id !== family.id) return { error: 'Unauthorized' }

  const { error: updateErr } = await supabase
    .from('lessons')
    .update({ status: 'rescheduled', note: parsed.data.note })
    .eq('id', lesson.id)

  if (updateErr) return { error: updateErr.message }

  const serviceClient = createServiceClient()
  const { data: newLesson, error: insertErr } = await serviceClient
    .from('lessons')
    .insert({
      student_id: lesson.student_id,
      scheduled_at: parsed.data.newScheduledAt,
      duration_minutes: lesson.duration_minutes,
      status: 'scheduled',
      parent_lesson_id: lesson.id,
    })
    .select('id')
    .single()

  if (insertErr) {
    await supabase.from('lessons').update({ status: 'scheduled', note: null }).eq('id', lesson.id)
    return { error: insertErr.message }
  }

  const emailContent = buildRescheduleEmail({
    studentName: student.name,
    originalAt: lesson.scheduled_at,
    newAt: parsed.data.newScheduledAt,
    durationMinutes: lesson.duration_minutes,
    note: parsed.data.note,
    newLessonId: newLesson.id,
  })

  try {
    const { error: emailErr } = await resend.emails.send({
      from: process.env.RESEND_FROM ?? 'Cadence <onboarding@resend.dev>',
      to: process.env.TEACHER_EMAIL ?? '',
      subject: emailContent.subject,
      html: emailContent.html,
    })
    if (emailErr) console.error('[reschedule] Resend error:', emailErr)
  } catch (e) {
    console.error('[reschedule] Email send threw:', e)
  }

  return { success: true }
}
