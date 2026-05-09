'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  updatePeriod, deletePeriod,
  addWindow, updateWindow, deleteWindowsByWeekday,
  addException, deleteException,
} from './availability-actions'

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
  const ampm = h < 12 ? 'AM' : 'PM'
  const hour = h % 12 || 12
  return m === 0 ? `${hour} ${ampm}` : `${hour}:${String(m).padStart(2, '0')} ${ampm}`
}

function fmtDate(d: string) {
  const [y, mo, day] = d.split('-').map(Number)
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${months[mo - 1]} ${day}, ${y}`
}

function fmtExDate(d: string) {
  const [, mo, day] = d.split('-').map(Number)
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${months[mo - 1]} ${day}`
}

interface Window { id: string; weekday: number; start_time: string; end_time: string }
interface Exception {
  id: string
  exception_date: string
  reason: string | null
  block_start: string | null
  block_end: string | null
}
export interface Period {
  id: string
  name: string
  start_date: string
  end_date: string
  availability_windows: Window[]
  period_exceptions: Exception[]
}

// ── Sub-components ─────────────────────────────────────────────────────────

function TimeSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="border rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      {TIME_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}

interface DayRowProps {
  weekday: number
  window: Window
  pending: boolean
  onSave: (id: string, start: string, end: string) => void
  onRemove: (weekday: number) => void
}

function OnDayRow({ weekday, window, pending, onSave, onRemove }: DayRowProps) {
  const [start, setStart] = useState(window.start_time)
  const [end, setEnd] = useState(window.end_time)
  const [error, setError] = useState('')

  const dirty = start !== window.start_time || end !== window.end_time

  function handleSave() {
    if (end <= start) { setError('End must be after start'); return }
    setError('')
    onSave(window.id, start, end)
  }

  return (
    <div className="space-y-0.5">
      <div className="flex items-center gap-2.5">
        <span className="w-11 shrink-0 text-xs font-semibold text-center bg-blue-100 text-blue-700 rounded-full py-1">
          {DAY_LABELS[weekday]}
        </span>
        <TimeSelect value={start} onChange={setStart} />
        <span className="text-gray-400 text-xs">to</span>
        <TimeSelect value={end} onChange={setEnd} />
        {dirty && (
          <button
            onClick={handleSave}
            disabled={pending}
            className="text-xs text-blue-600 font-medium hover:text-blue-800 disabled:opacity-40"
          >
            Save
          </button>
        )}
        <button
          onClick={() => onRemove(weekday)}
          disabled={pending}
          className="ml-auto text-gray-300 hover:text-red-400 text-base leading-none disabled:opacity-30"
          title="Remove day"
        >
          ×
        </button>
      </div>
      {error && <p className="text-xs text-red-500 pl-14">{error}</p>}
    </div>
  )
}

interface EnableRowProps {
  weekday: number
  pending: boolean
  onAdd: (weekday: number, start: string, end: string) => void
  onCancel: () => void
}

function EnableDayRow({ weekday, pending, onAdd, onCancel }: EnableRowProps) {
  const [start, setStart] = useState('15:00')
  const [end, setEnd] = useState('19:00')
  const [error, setError] = useState('')

  function handleAdd() {
    if (end <= start) { setError('End must be after start'); return }
    setError('')
    onAdd(weekday, start, end)
  }

  return (
    <div className="space-y-0.5">
      <div className="flex items-center gap-2.5">
        <span className="w-11 shrink-0 text-xs font-semibold text-center bg-gray-200 text-gray-500 rounded-full py-1">
          {DAY_LABELS[weekday]}
        </span>
        <TimeSelect value={start} onChange={setStart} />
        <span className="text-gray-400 text-xs">to</span>
        <TimeSelect value={end} onChange={setEnd} />
        <button
          onClick={handleAdd}
          disabled={pending}
          className="text-xs bg-blue-600 text-white rounded-lg px-2.5 py-1 hover:bg-blue-700 disabled:opacity-50"
        >
          Add
        </button>
        <button onClick={onCancel} className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
      </div>
      {error && <p className="text-xs text-red-500 pl-14">{error}</p>}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────

export function PeriodCard({ period }: { period: Period }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  // Header edit state
  const [editHeader, setEditHeader] = useState(false)
  const [editName, setEditName] = useState(period.name)
  const [editStart, setEditStart] = useState(period.start_date)
  const [editEnd, setEditEnd] = useState(period.end_date)
  const [headerError, setHeaderError] = useState('')

  // Grid state
  const [enablingDay, setEnablingDay] = useState<number | null>(null)
  const [gridError, setGridError] = useState('')

  // Exception form state
  const [exDate, setExDate] = useState('')
  const [exAllDay, setExAllDay] = useState(true)
  const [exStart, setExStart] = useState('09:00')
  const [exEnd, setExEnd] = useState('10:00')
  const [exReason, setExReason] = useState('')
  const [exError, setExError] = useState('')

  // Build weekday → window map (first window per weekday wins)
  const windowMap = new Map<number, Window>()
  for (const w of [...period.availability_windows].sort((a, b) => a.start_time.localeCompare(b.start_time))) {
    if (!windowMap.has(w.weekday)) windowMap.set(w.weekday, w)
  }

  const sortedExceptions = [...period.period_exceptions].sort((a, b) =>
    a.exception_date.localeCompare(b.exception_date)
  )

  // ── Header handlers ──
  function handleSaveHeader() {
    setHeaderError('')
    startTransition(async () => {
      const result = await updatePeriod(period.id, editName.trim(), editStart, editEnd)
      if (result.error) { setHeaderError(result.error); return }
      setEditHeader(false)
      router.refresh()
    })
  }

  function handleDeletePeriod() {
    if (!confirm(`Delete "${period.name}"? All windows and exceptions will be removed.`)) return
    startTransition(async () => { await deletePeriod(period.id); router.refresh() })
  }

  // ── Grid handlers ──
  function handleSaveWindow(id: string, start: string, end: string) {
    setGridError('')
    startTransition(async () => {
      const result = await updateWindow(id, start, end)
      if (result.error) { setGridError(result.error); return }
      router.refresh()
    })
  }

  function handleRemoveDay(weekday: number) {
    startTransition(async () => { await deleteWindowsByWeekday(period.id, weekday); router.refresh() })
  }

  function handleEnableDay(weekday: number, start: string, end: string) {
    setGridError('')
    startTransition(async () => {
      const result = await addWindow(period.id, weekday, start, end)
      if (result.error) { setGridError(result.error); return }
      setEnablingDay(null)
      router.refresh()
    })
  }

  // ── Exception handlers ──
  function handleAddException() {
    if (!exDate) { setExError('Pick a date.'); return }
    if (!exAllDay && exEnd <= exStart) { setExError('End time must be after start time.'); return }
    setExError('')
    startTransition(async () => {
      const result = await addException(
        period.id,
        exDate,
        exReason || undefined,
        exAllDay ? undefined : exStart,
        exAllDay ? undefined : exEnd,
      )
      if (result.error) { setExError(result.error); return }
      setExDate('')
      setExReason('')
      setExAllDay(true)
      router.refresh()
    })
  }

  function handleDeleteException(id: string) {
    startTransition(async () => { await deleteException(id); router.refresh() })
  }

  return (
    <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">

      {/* ── Header ── */}
      <div className="px-5 py-4 border-b bg-gray-50">
        {editHeader ? (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-3 items-end">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Name</label>
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="border rounded-lg px-3 py-1.5 text-sm w-40 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">From</label>
                <input
                  type="date"
                  value={editStart}
                  onChange={(e) => setEditStart(e.target.value)}
                  className="border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">To</label>
                <input
                  type="date"
                  value={editEnd}
                  onChange={(e) => setEditEnd(e.target.value)}
                  className="border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            {headerError && <p className="text-xs text-red-500">{headerError}</p>}
            <div className="flex gap-3">
              <button
                onClick={handleSaveHeader}
                disabled={pending || !editName.trim() || !editStart || !editEnd}
                className="text-xs bg-blue-600 text-white rounded-lg px-3 py-1.5 hover:bg-blue-700 disabled:opacity-50"
              >
                {pending ? 'Saving…' : 'Save'}
              </button>
              <button
                onClick={() => { setEditHeader(false); setEditName(period.name); setEditStart(period.start_date); setEditEnd(period.end_date); setHeaderError('') }}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-semibold text-gray-900">{period.name}</p>
              <p className="text-xs text-gray-500 mt-0.5">{fmtDate(period.start_date)} – {fmtDate(period.end_date)}</p>
            </div>
            <div className="flex gap-3 shrink-0">
              <button onClick={() => setEditHeader(true)} className="text-xs text-gray-500 hover:text-gray-800">
                Edit
              </button>
              <button onClick={handleDeletePeriod} disabled={pending} className="text-xs text-red-400 hover:text-red-600 disabled:opacity-40">
                Delete
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Weekly schedule grid ── */}
      <div className="px-5 py-4 space-y-2">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Weekly schedule</p>

        {Array.from({ length: 7 }, (_, weekday) => {
          const win = windowMap.get(weekday)
          const isEnabling = enablingDay === weekday

          if (win) {
            return (
              <OnDayRow
                key={weekday}
                weekday={weekday}
                window={win}
                pending={pending}
                onSave={handleSaveWindow}
                onRemove={handleRemoveDay}
              />
            )
          }

          if (isEnabling) {
            return (
              <EnableDayRow
                key={weekday}
                weekday={weekday}
                pending={pending}
                onAdd={handleEnableDay}
                onCancel={() => setEnablingDay(null)}
              />
            )
          }

          return (
            <div key={weekday} className="flex items-center gap-2.5">
              <button
                onClick={() => { setEnablingDay(weekday) }}
                className="w-11 shrink-0 text-xs font-semibold text-center bg-gray-100 text-gray-400 hover:bg-gray-200 rounded-full py-1 transition-colors"
              >
                {DAY_LABELS[weekday]}
              </button>
              <span className="text-xs text-gray-300">—</span>
            </div>
          )
        })}

        {gridError && <p className="text-xs text-red-500 mt-1">{gridError}</p>}
      </div>

      {/* ── Exceptions ── */}
      <div className="px-5 py-4 border-t bg-gray-50/60 space-y-3">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Day exceptions</p>

        {/* Existing chips */}
        <div className="flex flex-wrap gap-1.5">
          {sortedExceptions.length === 0 && (
            <span className="text-xs text-gray-300">None</span>
          )}
          {sortedExceptions.map((ex) => (
            <span
              key={ex.id}
              title={ex.reason ?? undefined}
              className="inline-flex items-center gap-1 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-full px-2.5 py-0.5"
            >
              {fmtExDate(ex.exception_date)}
              {ex.block_start && ex.block_end && (
                <span className="text-amber-600"> · {fmt12(ex.block_start)}–{fmt12(ex.block_end)}</span>
              )}
              <button
                onClick={() => handleDeleteException(ex.id)}
                disabled={pending}
                className="hover:text-red-500 disabled:opacity-40 leading-none pl-0.5"
              >
                ×
              </button>
            </span>
          ))}
        </div>

        {/* Add exception form */}
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="date"
              value={exDate}
              min={period.start_date}
              max={period.end_date}
              onChange={(e) => setExDate(e.target.value)}
              className="border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            {/* All day / Time range toggle */}
            <div className="flex rounded-lg border overflow-hidden text-xs font-medium">
              <button
                onClick={() => setExAllDay(true)}
                className={`px-2.5 py-1.5 transition-colors ${exAllDay ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
              >
                All day
              </button>
              <button
                onClick={() => setExAllDay(false)}
                className={`px-2.5 py-1.5 border-l transition-colors ${!exAllDay ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
              >
                Time range
              </button>
            </div>

            {!exAllDay && (
              <>
                <TimeSelect value={exStart} onChange={setExStart} />
                <span className="text-gray-400 text-xs">to</span>
                <TimeSelect value={exEnd} onChange={setExEnd} />
              </>
            )}

            <input
              type="text"
              value={exReason}
              onChange={(e) => setExReason(e.target.value)}
              placeholder="Reason (optional)"
              className="border rounded-lg px-2 py-1.5 text-sm w-40 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <button
              onClick={handleAddException}
              disabled={pending || !exDate}
              className="bg-amber-500 text-white rounded-lg px-3 py-1.5 text-xs font-medium hover:bg-amber-600 disabled:opacity-40"
            >
              Add exception
            </button>
          </div>
          {exError && <p className="text-xs text-red-500">{exError}</p>}
        </div>
      </div>
    </div>
  )
}
