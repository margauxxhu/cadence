import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { startOfMonth } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'
import { ParentDashboard } from './_components/parent-dashboard'

const TZ = 'America/Los_Angeles'

function toLADate(scheduledAt: string): string {
  const la = toZonedTime(new Date(scheduledAt), TZ)
  return `${la.getFullYear()}-${String(la.getMonth() + 1).padStart(2, '0')}-${String(la.getDate()).padStart(2, '0')}`
}

function toLATime(scheduledAt: string): string {
  const la = toZonedTime(new Date(scheduledAt), TZ)
  return `${String(la.getHours()).padStart(2, '0')}:${String(la.getMinutes()).padStart(2, '0')}`
}

function addMinsToTimeStr(time: string, mins: number): string {
  const [h, m] = time.split(':').map(Number)
  const total = Math.min(h * 60 + m + mins, 23 * 60 + 59)
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

export default async function MyLessonsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/magic-link')

  const { data: family } = await supabase
    .from('families')
    .select('id, parent_name, students(id, name)')
    .eq('parent_email', user.email!)
    .single()

  if (!family) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500">Your account isn&apos;t linked to any family yet.</p>
        <p className="text-sm text-gray-400 mt-2">Contact your teacher to get set up.</p>
      </div>
    )
  }

  const studentIds = (family.students as { id: string; name: string }[]).map((s) => s.id)
  const monthStart = startOfMonth(new Date())

  const [{ data: lessons }, { data: exceptions }, { data: blackouts }] = await Promise.all([
    supabase
      .from('lessons')
      .select('id, scheduled_at, duration_minutes, status, students(name)')
      .in('student_id', studentIds.length ? studentIds : ['00000000-0000-0000-0000-000000000000'])
      .eq('status', 'scheduled')
      .gte('scheduled_at', monthStart.toISOString())
      .order('scheduled_at')
      .limit(200),
    supabase
      .from('period_exceptions')
      .select('exception_date, block_start, block_end'),
    supabase
      .from('blackouts')
      .select('start_date, end_date'),
  ])

  // Determine which lessons conflict with period exceptions or blackouts
  const conflictedIds: string[] = []
  for (const lesson of lessons ?? []) {
    const laDate = toLADate(lesson.scheduled_at)
    const laTime = toLATime(lesson.scheduled_at)
    const laEnd  = addMinsToTimeStr(laTime, lesson.duration_minutes)

    const inBlackout = (blackouts ?? []).some(
      (b) => laDate >= b.start_date && laDate <= b.end_date
    )
    if (inBlackout) { conflictedIds.push(lesson.id); continue }

    for (const ex of exceptions ?? []) {
      if (ex.exception_date !== laDate) continue
      // Full-day exception
      if (!ex.block_start || !ex.block_end) { conflictedIds.push(lesson.id); break }
      // Partial: lesson overlaps the blocked time window
      if (laTime < ex.block_end && laEnd > ex.block_start) { conflictedIds.push(lesson.id); break }
    }
  }

  return (
    <ParentDashboard
      lessons={lessons ?? []}
      parentName={family.parent_name}
      conflictedIds={conflictedIds}
    />
  )
}
