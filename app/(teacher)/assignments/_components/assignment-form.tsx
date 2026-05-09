'use client'

import { useTransition } from 'react'
import { createAssignment } from './assignment-actions'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

interface Props {
  students: { id: string; name: string; families: { parent_name: string } | null }[]
}

export function AssignmentForm({ students }: Props) {
  const [pending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await createAssignment(fd)
      if ('success' in result) (e.target as HTMLFormElement).reset()
    })
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border p-4 space-y-3">
      <h2 className="font-medium text-sm">Add recurring lesson</h2>
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs font-medium mb-1">Student</label>
          <select name="student_id" required className="border rounded-lg px-2 py-1.5 text-sm">
            <option value="">Select…</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.families?.parent_name})
              </option>
            ))}
          </select>
        </div>
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
          <label className="block text-xs font-medium mb-1">Duration (min)</label>
          <input
            type="number"
            name="duration_minutes"
            defaultValue={45}
            min={15}
            step={15}
            className="w-20 border rounded-lg px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Active from</label>
          <input type="date" name="active_from" required className="border rounded-lg px-2 py-1.5 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Active until (optional)</label>
          <input type="date" name="active_until" className="border rounded-lg px-2 py-1.5 text-sm" />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="bg-blue-600 text-white rounded-lg px-4 py-1.5 text-sm hover:bg-blue-700 disabled:opacity-50"
        >
          Add
        </button>
      </div>
    </form>
  )
}
