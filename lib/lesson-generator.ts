import { addWeeks, startOfDay, addDays } from 'date-fns'
import { toZonedTime, fromZonedTime } from 'date-fns-tz'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

const TZ = 'America/Los_Angeles'
const HORIZON_WEEKS = 12

type Client = SupabaseClient<Database>

function nextWeekday(from: Date, targetWeekday: number): Date {
  // Returns the first date >= from that falls on targetWeekday (0=Sun)
  const day = from.getDay()
  const diff = (targetWeekday - day + 7) % 7
  return addDays(from, diff === 0 ? 0 : diff)
}

export async function generateLessons(
  supabase: Client
): Promise<{ created: number; skipped: number }> {
  const today = startOfDay(new Date())
  const horizonEnd = addWeeks(today, HORIZON_WEEKS)

  // Load all active assignments with student info
  const { data: assignments, error: aErr } = await supabase
    .from('recurring_assignments')
    .select('id, student_id, weekday, start_time, duration_minutes, active_from, active_until, students!inner(active)')
    .eq('students.active', true)
    .lte('active_from', horizonEnd.toISOString().slice(0, 10))

  if (aErr) throw aErr

  // Load blackouts overlapping the horizon
  const { data: blackouts, error: bErr } = await supabase
    .from('blackouts')
    .select('start_date, end_date')
    .lte('start_date', horizonEnd.toISOString().slice(0, 10))
    .gte('end_date', today.toISOString().slice(0, 10))

  if (bErr) throw bErr

  // Build existing scheduled lesson key set for idempotency
  const { data: existing, error: eErr } = await supabase
    .from('lessons')
    .select('student_id, scheduled_at')
    .eq('status', 'scheduled')
    .gte('scheduled_at', today.toISOString())
    .lte('scheduled_at', horizonEnd.toISOString())

  if (eErr) throw eErr

  const existingKeys = new Set<string>(
    (existing ?? []).map((l) => `${l.student_id}|${l.scheduled_at}`)
  )

  function isBlackedOut(date: Date): boolean {
    const laDate = toZonedTime(date, TZ)
    const laDateStr = `${laDate.getFullYear()}-${String(laDate.getMonth() + 1).padStart(2, '0')}-${String(laDate.getDate()).padStart(2, '0')}`
    return (blackouts ?? []).some(
      (b) => laDateStr >= b.start_date && laDateStr <= b.end_date
    )
  }

  const toInsert: Database['public']['Tables']['lessons']['Insert'][] = []
  let skipped = 0

  for (const assignment of assignments ?? []) {
    const activeFrom = startOfDay(new Date(assignment.active_from + 'T00:00:00'))
    const activeUntil = assignment.active_until
      ? startOfDay(new Date(assignment.active_until + 'T00:00:00'))
      : null

    let cursor = nextWeekday(
      activeFrom < today ? today : activeFrom,
      assignment.weekday
    )

    while (cursor <= horizonEnd && (!activeUntil || cursor <= activeUntil)) {
      // Build the scheduled_at in LA timezone
      const [hours, minutes] = (assignment.start_time as string).split(':').map(Number)
      const laLocal = toZonedTime(cursor, TZ)
      laLocal.setHours(hours, minutes, 0, 0)
      const scheduledAt = fromZonedTime(laLocal, TZ)

      if (isBlackedOut(cursor)) {
        skipped++
        cursor = addWeeks(cursor, 1)
        continue
      }

      const key = `${assignment.student_id}|${scheduledAt.toISOString()}`
      if (existingKeys.has(key)) {
        skipped++
        cursor = addWeeks(cursor, 1)
        continue
      }

      toInsert.push({
        student_id: assignment.student_id,
        scheduled_at: scheduledAt.toISOString(),
        duration_minutes: assignment.duration_minutes,
        status: 'scheduled',
      })
      existingKeys.add(key) // prevent duplicates within this batch

      cursor = addWeeks(cursor, 1)
    }
  }

  if (toInsert.length > 0) {
    const { error: iErr } = await supabase
      .from('lessons')
      .upsert(toInsert, { onConflict: 'student_id,scheduled_at', ignoreDuplicates: true })

    if (iErr) throw iErr
  }

  return { created: toInsert.length, skipped }
}
