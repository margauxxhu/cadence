import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { startOfMonth } from 'date-fns'
import { ParentDashboard } from './_components/parent-dashboard'

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

  const { data: lessons } = await supabase
    .from('lessons')
    .select('id, scheduled_at, duration_minutes, status, students(name)')
    .in('student_id', studentIds.length ? studentIds : ['00000000-0000-0000-0000-000000000000'])
    .eq('status', 'scheduled')
    .gte('scheduled_at', monthStart.toISOString())
    .order('scheduled_at')
    .limit(200)

  return (
    <ParentDashboard
      lessons={lessons ?? []}
      parentName={family.parent_name}
    />
  )
}
