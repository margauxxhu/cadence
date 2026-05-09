'use client'

import { useTransition } from 'react'
import { createAvailabilityWindow } from './availability-actions'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function AvailabilityForm() {
  const [pending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      await createAvailabilityWindow(fd)
      ;(e.target as HTMLFormElement).reset()
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap gap-3 items-end">
      <div>
        <label className="block text-xs font-medium mb-1">Day</label>
        <select name="weekday" className="border rounded-lg px-2 py-1.5 text-sm">
          {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium mb-1">Start</label>
        <input type="time" name="start_time" required className="border rounded-lg px-2 py-1.5 text-sm" />
      </div>
      <div>
        <label className="block text-xs font-medium mb-1">End</label>
        <input type="time" name="end_time" required className="border rounded-lg px-2 py-1.5 text-sm" />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="bg-blue-600 text-white rounded-lg px-4 py-1.5 text-sm hover:bg-blue-700 disabled:opacity-50"
      >
        Add window
      </button>
    </form>
  )
}
