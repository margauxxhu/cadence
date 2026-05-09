import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { LessonsList } from './_components/lessons-list'

export default async function MyLessonsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/magic-link')

  // Find this parent's family
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

  const { data: lessons } = await supabase
    .from('lessons')
    .select('id, scheduled_at, duration_minutes, status, note, late_cancel, student_id, students(name)')
    .in('student_id', studentIds.length ? studentIds : ['00000000-0000-0000-0000-000000000000'])
    .eq('status', 'scheduled')
    .gte('scheduled_at', new Date().toISOString())
    .order('scheduled_at')
    .limit(60)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Upcoming Lessons</h1>
        <p className="text-gray-500 text-sm mt-1">Hi, {family.parent_name}</p>
      </div>

      <LessonsList lessons={lessons ?? []} />
    </div>
  )
}
