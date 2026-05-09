'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createPeriod } from './availability-actions'

export function PeriodForm() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()

  function handleSubmit() {
    setError('')
    startTransition(async () => {
      const result = await createPeriod(name.trim(), startDate, endDate)
      if (result.error) { setError(result.error); return }
      setOpen(false)
      setName('')
      setStartDate('')
      setEndDate('')
      router.refresh()
    })
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-800 bg-white border border-blue-200 rounded-xl px-4 py-2.5 shadow-sm hover:shadow transition-shadow"
      >
        <span className="text-base leading-none">+</span> New period
      </button>
    )
  }

  return (
    <div className="bg-white rounded-2xl border shadow-sm p-5 space-y-4">
      <p className="font-semibold text-gray-900">New availability period</p>
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Fall 2026"
            className="border rounded-lg px-3 py-1.5 text-sm w-44 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
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
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-3">
        <button
          onClick={handleSubmit}
          disabled={pending || !name || !startDate || !endDate}
          className="bg-blue-600 text-white rounded-lg px-4 py-1.5 text-sm hover:bg-blue-700 disabled:opacity-50"
        >
          {pending ? 'Creating…' : 'Create period'}
        </button>
        <button
          onClick={() => { setOpen(false); setError('') }}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
