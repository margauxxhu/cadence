'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createBlackout, deleteBlackout } from './availability-actions'

function fmtDate(d: string) {
  const [y, mo, day] = d.split('-').map(Number)
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${months[mo - 1]} ${day}, ${y}`
}

interface Blackout { id: string; start_date: string; end_date: string; reason: string | null }

export function BlackoutSection({ blackouts }: { blackouts: Blackout[] }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')

  function handleAdd() {
    setError('')
    startTransition(async () => {
      const result = await createBlackout(startDate, endDate, reason || undefined)
      if (result.error) { setError(result.error); return }
      setStartDate('')
      setEndDate('')
      setReason('')
      router.refresh()
    })
  }

  function handleDelete(id: string) {
    startTransition(async () => { await deleteBlackout(id); router.refresh() })
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Holiday Blackouts</h2>
        <p className="text-sm text-gray-500 mt-0.5">Date ranges when no lessons run — applies across all periods.</p>
      </div>

      {/* List */}
      <div className="bg-white rounded-2xl border shadow-sm divide-y">
        {blackouts.length === 0 ? (
          <p className="px-5 py-5 text-sm text-gray-400">No blackouts yet.</p>
        ) : (
          blackouts.map((b) => (
            <div key={b.id} className="flex items-center justify-between px-5 py-3 group">
              <div>
                <p className="text-sm font-medium text-gray-800">
                  {b.start_date === b.end_date
                    ? fmtDate(b.start_date)
                    : `${fmtDate(b.start_date)} – ${fmtDate(b.end_date)}`}
                </p>
                {b.reason && <p className="text-xs text-gray-400 mt-0.5">{b.reason}</p>}
              </div>
              <button
                onClick={() => handleDelete(b.id)}
                disabled={pending}
                className="text-xs text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-30"
              >
                Remove
              </button>
            </div>
          ))
        )}
      </div>

      {/* Add form */}
      <div className="bg-white rounded-2xl border shadow-sm p-5 space-y-3">
        <p className="text-sm font-medium text-gray-700">Add blackout</p>
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Start date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">End date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Label (optional)</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Winter break"
              className="border rounded-lg px-2 py-1.5 text-sm w-44 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={handleAdd}
            disabled={pending || !startDate || !endDate}
            className="bg-gray-800 text-white rounded-lg px-4 py-1.5 text-sm hover:bg-gray-900 disabled:opacity-40"
          >
            {pending ? 'Adding…' : 'Add blackout'}
          </button>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </section>
  )
}
