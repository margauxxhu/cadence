import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createStudent, toggleStudentActive } from './_components/family-actions'
import { updateFamily } from '../_components/families-actions'

export default async function FamilyDetailPage({
  params,
}: {
  params: Promise<{ familyId: string }>
}) {
  const { familyId } = await params
  const supabase = await createClient()

  const { data: family } = await supabase
    .from('families')
    .select('*, students(*)')
    .eq('id', familyId)
    .single()

  if (!family) notFound()

  const updateThisFamily = updateFamily.bind(null, familyId)

  return (
    <div className="space-y-8 max-w-lg">
      <h1 className="text-2xl font-semibold">{family.parent_name}</h1>

      <section className="bg-white rounded-xl border p-6 space-y-4">
        <h2 className="font-medium">Family info</h2>
        <form action={updateThisFamily} className="space-y-3">
          <div>
            <label className="block text-xs font-medium mb-1">Parent name</label>
            <input
              name="parent_name"
              defaultValue={family.parent_name}
              required
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Parent email</label>
            <input
              name="parent_email"
              type="email"
              defaultValue={family.parent_email}
              required
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            className="bg-blue-600 text-white rounded-lg px-4 py-1.5 text-sm hover:bg-blue-700"
          >
            Save
          </button>
        </form>
      </section>

      <section className="space-y-4">
        <h2 className="font-medium">Students</h2>
        <div className="bg-white rounded-xl border divide-y">
          {!family.students?.length ? (
            <p className="px-4 py-4 text-gray-400 text-sm">No students yet.</p>
          ) : (
            (family.students as { id: string; name: string; active: boolean }[]).map((s) => (
              <div key={s.id} className="flex items-center justify-between px-4 py-3">
                <span className={`text-sm ${s.active ? '' : 'text-gray-400 line-through'}`}>
                  {s.name}
                </span>
                <form action={toggleStudentActive.bind(null, s.id, !s.active, familyId)}>
                  <button className="text-xs text-gray-400 hover:text-gray-700">
                    {s.active ? 'Deactivate' : 'Activate'}
                  </button>
                </form>
              </div>
            ))
          )}
        </div>

        <form action={createStudent} className="flex gap-2">
          <input type="hidden" name="family_id" value={familyId} />
          <input
            name="name"
            placeholder="Student name"
            required
            className="flex-1 border rounded-lg px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm hover:bg-blue-700"
          >
            Add student
          </button>
        </form>
      </section>
    </div>
  )
}
