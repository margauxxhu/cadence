'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createPeriodWithSchedule } from './availability-actions'

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

const DEFAULT_START = '15:00'
const DEFAULT_END = '19:00'

interface DayState { enabled: boolean; start: string; end: string }

export function PeriodForm() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [schedule, setSchedule] = useState<DayState[]>(
    Array.from({ length: 7 }, () => ({ enabled: false, start: DEFAULT_START, end: DEFAULT_END }))
  )
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()

  function toggleDay(i: number) {
    setSchedule((prev) => {
      const next = [...prev]
      next[i] = { ...next[i], enabled: !next[i].enabled }
      return next
    })
  }

  function setDayTime(i: number, field: 'start' | 'end', value: string) {
    setSchedule((prev) => {
      const next = [...prev]
      next[i] = { ...next[i], [field]: value }
      return next
    })
  }

  function handleClose() {
    setOpen(false)
    setName('')
    setStartDate('')
    setEndDate('')
    setSchedule(Array.from({ length: 7 }, () => ({ enabled: false, start: DEFAULT_START, end: DEFAULT_END })))
    setError('')
  }

  function handleSubmit() {
    setError('')
    const days = schedule
      .map((s, i) => (s.enabled ? { weekday: i, start_time: s.start, end_time: s.end } : null))
      .filter((d): d is { weekday: number; start_time: string; end_time: string } => d !== null)

    startTransition(async () => {
      const result = await createPeriodWithSchedule(name.trim(), startDate, endDate, days)
      if (result.error) { setError(result.error); return }
      handleClose()
      router.refresh()
    })
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-800 bg-white border border-blue-200 rounded-xl px-4 py-2.5 shadow-sm"
      >
        <span className="text-base leading-none">+</span> New period
      </button>
    )
  }

  return (
    <div className="bg-white rounded-2xl border shadow-sm p-5 space-y-5">
      <p className="font-semibold text-gray-900">New availability period</p>

      {/* Name + dates */}
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Fall 2026"
            className="border rounded-lg px-3 py-1.5 text-sm w-40 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">From</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">To</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* 7-day schedule */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Weekly schedule</p>
        <div className="space-y-2">
          {DAY_LABELS.map((day, i) => (
            <div key={i} className="flex items-center gap-3 min-h-[32px]">
              <button
                onClick={() => toggleDay(i)}
                className={`w-11 shrink-0 text-xs font-semibold rounded-full py-1 transition-colors ${
                  schedule[i].enabled
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                }`}
              >
                {day}
              </button>

              {schedule[i].enabled ? (
                <div className="flex items-center gap-2">
                  <select
                    value={schedule[i].start}
                    onChange={(e) => setDayTime(i, 'start', e.target.value)}
                    className="border rounded-lg px-2 py-1 text-sm"
                  >
                    {TIME_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <span className="text-gray-400 text-sm">to</span>
                  <select
                    value={schedule[i].end}
                    onChange={(e) => setDayTime(i, 'end', e.target.value)}
                    className="border rounded-lg px-2 py-1 text-sm"
                  >
                    {TIME_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              ) : (
                <span className="text-xs text-gray-300">— off</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-3 pt-1">
        <button
          onClick={handleSubmit}
          disabled={pending || !name.trim() || !startDate || !endDate}
          className="bg-blue-600 text-white rounded-lg px-4 py-1.5 text-sm hover:bg-blue-700 disabled:opacity-50"
        >
          {pending ? 'Creating…' : 'Create period'}
        </button>
        <button onClick={handleClose} className="text-sm text-gray-500 hover:text-gray-700">
          Cancel
        </button>
      </div>
    </div>
  )
}
