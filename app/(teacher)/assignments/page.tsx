import { createClient } from '@/lib/supabase/server'
import { AssignmentForm } from './_components/assignment-form'
import { deleteAssignment } from './_components/assignment-actions'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function fmt12(t: string) {
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`
}

export default async function AssignmentsPage() {
  const supabase = await createClient()

  const [{ data: assignments }, { data: students }] = await Promise.all([
    supabase
      .from('recurring_assignments')
      .select('*, students(name, families(parent_name))')
      .order('weekday')
      .order('start_time'),
    supabase
      .from('students')
      .select('id, name, families(parent_name)')
      .eq('active', true)
      .order('name'),
  ])

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Your Schedule</h1>
      <AssignmentForm students={(students ?? []) as { id: string; name: string; families: { parent_name: string } | null }[]} />

      <div className="bg-white rounded-xl border divide-y">
        {!assignments?.length ? (
          <p className="px-4 py-6 text-gray-400 text-sm">No assignments yet.</p>
        ) : (
          assignments.map((a) => {
            const student = a.students as { name: string; families: { parent_name: string } | null } | null
            return (
              <div key={a.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium">
                    {student?.name ?? '—'}
                    <span className="text-gray-400 font-normal ml-1 text-xs">
                      ({student?.families?.parent_name})
                    </span>
                  </p>
                  <p className="text-xs text-gray-500">
                    {DAYS[a.weekday]} {fmt12(a.start_time as string)} · {a.duration_minutes} min
                    {a.active_until && ` · until ${a.active_until}`}
                  </p>
                </div>
                <form action={deleteAssignment.bind(null, a.id)}>
                  <button className="text-xs text-red-500 hover:text-red-700">Remove</button>
                </form>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
