import { createClient } from '@/lib/supabase/server'
import { AvailabilityForm } from './_components/availability-form'
import { deleteAvailabilityWindow } from './_components/availability-actions'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function fmt12(t: string) {
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`
}

export default async function AvailabilityPage() {
  const supabase = await createClient()
  const { data: windows } = await supabase
    .from('availability_template')
    .select('*')
    .order('weekday')
    .order('start_time')

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Availability</h1>
      <AvailabilityForm />
      <div className="bg-white rounded-xl border divide-y">
        {!windows?.length ? (
          <p className="px-4 py-6 text-gray-400 text-sm">No windows yet.</p>
        ) : (
          windows.map((w) => (
            <div key={w.id} className="flex items-center justify-between px-4 py-3">
              <p className="text-sm">
                <span className="font-medium">{DAYS[w.weekday]}</span>{' '}
                {fmt12(w.start_time as string)} – {fmt12(w.end_time as string)}
              </p>
              <form action={async () => { 'use server'; await deleteAvailabilityWindow(w.id) }}>
                <button className="text-xs text-red-500 hover:text-red-700">Remove</button>
              </form>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
