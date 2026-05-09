import { createClient } from '@/lib/supabase/server'
import { createBlackout, deleteBlackout } from './_components/blackout-actions'

export default async function BlackoutsPage() {
  const supabase = await createClient()
  const { data: blackouts } = await supabase
    .from('blackouts')
    .select('*')
    .order('start_date')

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Blackout Dates</h1>
      <p className="text-gray-500 text-sm">Lessons will not be generated during blackout periods.</p>

      <form action={createBlackout} className="bg-white rounded-xl border p-4 space-y-3">
        <h2 className="font-medium text-sm">Add blackout</h2>
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs font-medium mb-1">Start date</label>
            <input type="date" name="start_date" required className="border rounded-lg px-2 py-1.5 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">End date</label>
            <input type="date" name="end_date" required className="border rounded-lg px-2 py-1.5 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Reason (optional)</label>
            <input
              type="text"
              name="reason"
              placeholder="e.g. Spring break"
              className="border rounded-lg px-2 py-1.5 text-sm"
            />
          </div>
          <button
            type="submit"
            className="bg-blue-600 text-white rounded-lg px-4 py-1.5 text-sm hover:bg-blue-700"
          >
            Add blackout
          </button>
        </div>
      </form>

      <div className="bg-white rounded-xl border divide-y">
        {!blackouts?.length ? (
          <p className="px-4 py-6 text-gray-400 text-sm">No blackout dates.</p>
        ) : (
          blackouts.map((b) => (
            <div key={b.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-medium">
                  {b.start_date === b.end_date ? b.start_date : `${b.start_date} – ${b.end_date}`}
                </p>
                {b.reason && <p className="text-xs text-gray-400">{b.reason}</p>}
              </div>
              <form action={deleteBlackout.bind(null, b.id)}>
                <button className="text-xs text-red-500 hover:text-red-700">Remove</button>
              </form>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
