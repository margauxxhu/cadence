import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function FamiliesPage() {
  const supabase = await createClient()
  const { data: families } = await supabase
    .from('families')
    .select('id, parent_name, parent_email, students(id)')
    .order('parent_name')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Families</h1>
        <Link
          href="/families/new"
          className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm hover:bg-blue-700"
        >
          Add family
        </Link>
      </div>

      <div className="bg-white rounded-xl border divide-y">
        {!families?.length ? (
          <p className="px-4 py-6 text-gray-400 text-sm">No families yet.</p>
        ) : (
          families.map((f) => (
            <Link
              key={f.id}
              href={`/families/${f.id}`}
              className="flex items-center justify-between px-4 py-3 hover:bg-gray-50"
            >
              <div>
                <p className="text-sm font-medium">{f.parent_name}</p>
                <p className="text-xs text-gray-500">{f.parent_email}</p>
              </div>
              <span className="text-xs text-gray-400">
                {Array.isArray(f.students) ? f.students.length : 0} student(s) →
              </span>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}
