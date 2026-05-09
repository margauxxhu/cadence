import { createClient } from '@/lib/supabase/server'
import { subMonths, addWeeks } from 'date-fns'
import { LessonCalendarView } from './_components/lesson-calendar-view'

export default async function LessonsPage() {
  const supabase = await createClient()

  const rangeStart = subMonths(new Date(), 12).toISOString()
  const rangeEnd = addWeeks(new Date(), 12).toISOString()

  const [{ data: lessons }, { data: students }, { data: semesters }] = await Promise.all([
    supabase
      .from('lessons')
      .select('id, student_id, scheduled_at, duration_minutes, status, note, late_cancel, students(name, families(parent_name))')
      .gte('scheduled_at', rangeStart)
      .lte('scheduled_at', rangeEnd)
      .order('scheduled_at', { ascending: false })
      .limit(2000),
    supabase
      .from('students')
      .select('id, name')
      .eq('active', true)
      .order('name'),
    supabase
      .from('availability_periods')
      .select('id, start_date, end_date')
      .order('start_date', { ascending: false }),
  ])

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Lesson History</h1>
      <LessonCalendarView
        lessons={lessons ?? []}
        students={students ?? []}
        semesters={semesters ?? []}
      />
    </div>
  )
}
