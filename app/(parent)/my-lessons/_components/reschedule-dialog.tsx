'use client'

import { useState, useTransition, useEffect, useMemo } from 'react'
import { toZonedTime } from 'date-fns-tz'
import { startOfWeek, addDays } from 'date-fns'
import { getAvailableSlots, rescheduleLesson } from './reschedule-actions'
import { formatLessonTime } from '@/lib/format-lesson-time'

const TZ = 'America/Los_Angeles'
const DAY_HEADERS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

function toLADateKey(iso: string): string {
  const la = toZonedTime(new Date(iso), TZ)
  return `${la.getFullYear()}-${String(la.getMonth() + 1).padStart(2, '0')}-${String(la.getDate()).padStart(2, '0')}`
}

interface Props {
  lessonId: string
  scheduledAt: string
  onRescheduled: () => void
}

export function RescheduleDialog({ lessonId, scheduledAt, onRescheduled }: Props) {
  const [open, setOpen] = useState(false)
  const [fetchKey, setFetchKey] = useState(0)
  const [slots, setSlots] = useState<{ scheduledAt: string; displayTime: string }[]>([])
  const [slotsReady, setSlotsReady] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selected, setSelected] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()

  // 4-week grid anchored to this week's Sunday in LA time
  const todayLA = toZonedTime(new Date(), TZ)
  const todayKey = `${todayLA.getFullYear()}-${String(todayLA.getMonth() + 1).padStart(2, '0')}-${String(todayLA.getDate()).padStart(2, '0')}`
  const weekStart = startOfWeek(todayLA)
  const calendarDays = Array.from({ length: 28 }, (_, i) => addDays(weekStart, i))

  const slotsByDate = useMemo(() => {
    const map = new Map<string, { scheduledAt: string; displayTime: string }[]>()
    for (const slot of slots) {
      const key = toLADateKey(slot.scheduledAt)
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(slot)
    }
    return map
  }, [slots])

  const slotsForDate = selectedDate ? (slotsByDate.get(selectedDate) ?? []) : []

  useEffect(() => {
    if (fetchKey === 0) return
    let active = true
    getAvailableSlots(lessonId).then(({ slots: s, error: e }) => {
      if (!active) return
      setSlots(s ?? [])
      if (e) setError(e)
      setSlotsReady(true)
    })
    return () => { active = false }
  }, [fetchKey, lessonId])

  function handleOpen() {
    setOpen(true)
    setSlotsReady(false)
    setSlots([])
    setSelectedDate(null)
    setSelected('')
    setNote('')
    setError('')
    setFetchKey((k) => k + 1)
  }

  function handleClose() {
    setOpen(false)
    setSelectedDate(null)
    setSelected('')
    setNote('')
    setError('')
    setSlots([])
    setSlotsReady(false)
  }

  function handleConfirm() {
    if (!selected) { setError('Please select a time slot.'); return }
    if (!note.trim()) { setError('Please add a note.'); return }
    setError('')
    startTransition(async () => {
      const result = await rescheduleLesson(lessonId, selected, note)
      if (result.error) { setError(result.error); return }
      handleClose()
      onRescheduled()
    })
  }

  const loading = !slotsReady

  return (
    <>
      <button onClick={handleOpen} className="text-xs text-blue-500 hover:text-blue-700 font-medium">
        Reschedule
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6 space-y-5">
            <div>
              <h2 className="font-semibold text-lg">Reschedule lesson</h2>
              <p className="text-sm text-gray-500 mt-0.5">{formatLessonTime(scheduledAt)}</p>
            </div>

            {loading ? (
              <p className="text-sm text-gray-400 py-8 text-center">Loading available times…</p>
            ) : slots.length === 0 ? (
              <p className="text-sm text-gray-400 py-8 text-center">No available slots in the next 4 weeks.</p>
            ) : (
              <div className="flex gap-8">
                {/* Mini calendar — 4-week grid */}
                <div className="shrink-0">
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">Pick a date</p>
                  <div className="grid grid-cols-7 mb-1">
                    {DAY_HEADERS.map((d) => (
                      <div key={d} className="w-9 text-center text-xs text-gray-400">{d}</div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-y-0.5">
                    {calendarDays.map((day) => {
                      const key = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`
                      const hasSlots = slotsByDate.has(key)
                      const isSelected = selectedDate === key
                      const isToday = key === todayKey
                      return (
                        <button
                          key={key}
                          disabled={!hasSlots}
                          onClick={() => { setSelectedDate(key); setSelected('') }}
                          className={`
                            w-9 h-9 flex items-center justify-center rounded-full text-sm transition-colors
                            ${isSelected
                              ? 'bg-blue-600 text-white font-semibold'
                              : hasSlots
                              ? 'text-blue-700 font-medium hover:bg-blue-50'
                              : isToday
                              ? 'text-blue-300'
                              : 'text-gray-300 cursor-default'}
                          `}
                        >
                          {day.getDate()}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Slot list */}
                <div className="flex-1 min-w-0 border-l pl-8">
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">Available times</p>
                  {!selectedDate ? (
                    <p className="text-sm text-gray-400">Select a date to see available times.</p>
                  ) : slotsForDate.length === 0 ? (
                    <p className="text-sm text-gray-400">No slots on this day.</p>
                  ) : (
                    <div className="space-y-2 max-h-52 overflow-y-auto">
                      {slotsForDate.map((slot) => (
                        <button
                          key={slot.scheduledAt}
                          onClick={() => setSelected(slot.scheduledAt)}
                          className={`w-full text-left px-4 py-2.5 rounded-lg text-sm transition-colors ${
                            selected === slot.scheduledAt
                              ? 'bg-blue-600 text-white font-medium'
                              : 'border hover:bg-gray-50 text-gray-700'
                          }`}
                        >
                          {formatLessonTime(slot.scheduledAt, 'time')}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-1">
                Note <span className="text-red-500">*</span>
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                className="w-full border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Brief reason for rescheduling…"
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex gap-3 justify-end">
              <button onClick={handleClose} className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5">
                Back
              </button>
              <button
                onClick={handleConfirm}
                disabled={pending || loading || !slots.length}
                className="bg-blue-600 text-white rounded-lg px-4 py-1.5 text-sm hover:bg-blue-700 disabled:opacity-50"
              >
                {pending ? 'Rescheduling…' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
