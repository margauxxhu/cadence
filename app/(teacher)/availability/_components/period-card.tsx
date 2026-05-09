'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { addWindow, deleteWindow, addException, deleteException, deletePeriod } from './availability-actions'

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const TIME_OPTIONS = (() => {
  const opts: { label: string; value: string }[] = []
  for (let h = 7; h <= 21; h++) {
    for (let m = 0; m < 60; m += 30) {
      if (h === 21 && m > 0) break
      opts.push({
        value: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
        label: `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`,
      })
    }
  }
  return opts
})()

function fmt12(t: string) {
  const [h, m] = t.split(':').map(Number)
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`
}

function fmtDate(d: string) {
  const [y, mo, day] = d.split('-').map(Number)
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${months[mo - 1]} ${day}, ${y}`
}

function fmtExDate(d: string) {
  const [, mo, day] = d.split('-').map(Number)
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${months[mo - 1]} ${day}`
}

interface Window { id: string; weekday: number; start_time: string; end_time: string }
interface Exception { id: string; exception_date: string; reason: string | null }
export interface Period {
  id: string
  name: string
  start_date: string
  end_date: string
  availability_windows: Window[]
  period_exceptions: Exception[]
}

export function PeriodCard({ period }: { period: Period }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const [showAddWindow, setShowAddWindow] = useState(false)
  const [newDay, setNewDay] = useState(1)
  const [newStart, setNewStart] = useState('15:00')
  const [newEnd, setNewEnd] = useState('19:00')
  const [windowError, setWindowError] = useState('')

  const [newExDate, setNewExDate] = useState('')
  const [newExReason, setNewExReason] = useState('')
  const [exError, setExError] = useState('')

  const sortedWindows = [...period.availability_windows].sort((a, b) => a.weekday - b.weekday || a.start_time.localeCompare(b.start_time))
  const sortedExceptions = [...period.period_exceptions].sort((a, b) => a.exception_date.localeCompare(b.exception_date))

  function handleAddWindow() {
    setWindowError('')
    startTransition(async () => {
      const result = await addWindow(period.id, newDay, newStart, newEnd)
      if (result.error) { setWindowError(result.error); return }
      setShowAddWindow(false)
      router.refresh()
    })
  }

  function handleDeleteWindow(id: string) {
    startTransition(async () => { await deleteWindow(id); router.refresh() })
  }

  function handleAddException() {
    if (!newExDate) { setExError('Pick a date.'); return }
    setExError('')
    startTransition(async () => {
      const result = await addException(period.id, newExDate, newExReason || undefined)
      if (result.error) { setExError(result.error); return }
      setNewExDate('')
      setNewExReason('')
      router.refresh()
    })
  }

  function handleDeleteException(id: string) {
    startTransition(async () => { await deleteException(id); router.refresh() })
  }

  function handleDeletePeriod() {
    if (!confirm(`Delete "${period.name}"? This removes all its windows and exceptions.`)) return
    startTransition(async () => { await deletePeriod(period.id); router.refresh() })
  }

  return (
    <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b bg-gray-50">
        <div>
          <p className="font-semibold text-gray-900">{period.name}</p>
          <p className="text-xs text-gray-500 mt-0.5">{fmtDate(period.start_date)} – {fmtDate(period.end_date)}</p>
        </div>
        <button
          onClick={handleDeletePeriod}
          disabled={pending}
          className="text-xs text-red-400 hover:text-red-600 disabled:opacity-40"
        >
          Delete period
        </button>
      </div>

      {/* Windows */}
      <div className="px-5 py-4 space-y-2">
        {sortedWindows.length === 0 && (
          <p className="text-sm text-gray-400">No days added yet.</p>
        )}
        {sortedWindows.map((w) => (
          <div key={w.id} className="flex items-center justify-between group">
            <p className="text-sm">
              <span className="font-medium w-10 inline-block">{DAY_LABELS[w.weekday]}</span>
              <span className="text-gray-600">{fmt12(w.start_time)} – {fmt12(w.end_time)}</span>
            </p>
            <button
              onClick={() => handleDeleteWindow(w.id)}
              disabled={pending}
              className="text-xs text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-30"
            >
              Remove
            </button>
          </div>
        ))}

        {/* Add window toggle */}
        {!showAddWindow ? (
          <button
            onClick={() => setShowAddWindow(true)}
            className="mt-1 text-sm text-blue-500 hover:text-blue-700 font-medium"
          >
            + Add day
          </button>
        ) : (
          <div className="mt-3 pt-3 border-t space-y-3">
            {/* Weekday chips */}
            <div className="flex gap-1.5 flex-wrap">
              {DAY_LABELS.map((d, i) => (
                <button
                  key={i}
                  onClick={() => setNewDay(i)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                    newDay === i ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>

            {/* Time selects */}
            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={newStart}
                onChange={(e) => setNewStart(e.target.value)}
                className="border rounded-lg px-2 py-1.5 text-sm"
              >
                {TIME_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <span className="text-gray-400 text-sm">to</span>
              <select
                value={newEnd}
                onChange={(e) => setNewEnd(e.target.value)}
                className="border rounded-lg px-2 py-1.5 text-sm"
              >
                {TIME_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <button
                onClick={handleAddWindow}
                disabled={pending}
                className="bg-blue-600 text-white rounded-lg px-3 py-1.5 text-sm hover:bg-blue-700 disabled:opacity-50"
              >
                Add
              </button>
              <button
                onClick={() => { setShowAddWindow(false); setWindowError('') }}
                className="text-sm text-gray-400 hover:text-gray-600"
              >
                Cancel
              </button>
            </div>
            {windowError && <p className="text-xs text-red-500">{windowError}</p>}
          </div>
        )}
      </div>

      {/* Exceptions */}
      <div className="px-5 py-4 border-t bg-gray-50/50 space-y-3">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Day exceptions</p>

        <div className="flex flex-wrap gap-1.5">
          {sortedExceptions.map((ex) => (
            <span
              key={ex.id}
              title={ex.reason ?? undefined}
              className="inline-flex items-center gap-1 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-full px-2.5 py-0.5"
            >
              {fmtExDate(ex.exception_date)}
              <button
                onClick={() => handleDeleteException(ex.id)}
                disabled={pending}
                className="hover:text-red-500 disabled:opacity-40 leading-none"
              >
                ×
              </button>
            </span>
          ))}
          {sortedExceptions.length === 0 && (
            <span className="text-xs text-gray-400">No exceptions</span>
          )}
        </div>

        {/* Add exception */}
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={newExDate}
            min={period.start_date}
            max={period.end_date}
            onChange={(e) => setNewExDate(e.target.value)}
            className="border rounded-lg px-2 py-1.5 text-sm"
          />
          <input
            type="text"
            value={newExReason}
            onChange={(e) => setNewExReason(e.target.value)}
            placeholder="Reason (optional)"
            className="border rounded-lg px-2 py-1.5 text-sm w-44"
          />
          <button
            onClick={handleAddException}
            disabled={pending || !newExDate}
            className="bg-amber-500 text-white rounded-lg px-3 py-1.5 text-sm hover:bg-amber-600 disabled:opacity-40"
          >
            Add exception
          </button>
        </div>
        {exError && <p className="text-xs text-red-500">{exError}</p>}
      </div>
    </div>
  )
}
