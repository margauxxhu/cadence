'use client'

import { useState, useTransition, useEffect, useMemo } from 'react'
import { toZonedTime } from 'date-fns-tz'
import { startOfWeek, addDays } from 'date-fns'
import { getAvailableSlotsForAdd, addLesson } from './add-lesson-actions'
import { formatLessonTime } from '@/lib/format-lesson-time'

const TZ = 'America/Los_Angeles'
const DAY_HEADERS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const DEFAULT_DURATION = 45

interface Student { id: string; name: string }

interface Props {
  students: Student[]
  onAdded: () => void
}

function toLADateKey(iso: string): string {
  const la = toZonedTime(new Date(iso), TZ)
  return `${la.getFullYear()}-${String(la.getMonth() + 1).padStart(2, '0')}-${String(la.getDate()).padStart(2, '0')}`
}

export function AddLessonDialog({ students, onAdded }: Props) {
  const [open, setOpen] = useState(false)
  const [studentId, setStudentId] = useState(students[0]?.id ?? '')
  const [fetchKey, setFetchKey] = useState(0)
  const [slots, setSlots] = useState<{ scheduledAt: string; displayTime: string }[]>([])
  const [slotsReady, setSlotsReady] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selected, setSelected] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [result, setResult] = useState<{ isPending?: boolean } | null>(null)
  const [pending, startTransition] = useTransition()

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
    setSlotsReady(false)
    setSlots([])
    setSelectedDate(null)
    setSelected('')
    getAvailableSlotsForAdd(studentId, DEFAULT_DURATION).then(({ slots: s, error: e }) => {
      if (!active) return
      setSlots(s ?? [])
      if (e) setError(e)
      setSlotsReady(true)
    })
    return () => { active = false }
  }, [fetchKey, studentId])

  function handleOpen() {
    setOpen(true)
    setResult(null)
    setError('')
    setNote('')
    setSelected('')
    setSelectedDate(null)
    setStudentId(students[0]?.id ?? '')
    setFetchKey((k) => k + 1)
  }

  function handleClose() {
    setOpen(false)
    setResult(null)
    setSlots([])
    setSlotsReady(false)
    setSelected('')
    setSelectedDate(null)
    setNote('')
    setError('')
  }

  function handleStudentChange(id: string) {
    setStudentId(id)
    setFetchKey((k) => k + 1)
  }

  function handleConfirm() {
    if (!selected) { setError('Please select a time slot.'); return }
    setError('')
    startTransition(async () => {
      const res = await addLesson(studentId, selected, note, DEFAULT_DURATION)
      if (res.error) { setError(res.error); return }
      setResult({ isPending: res.isPending })
      onAdded()
    })
  }

  const loading = !slotsReady

  if (result) {
    return (
      <>
        <button onClick={handleOpen} className="text-sm text-blue-600 hover:text-blue-800 font-medium">
          + Add lesson
        </button>
        {open && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 text-center space-y-4">
              <div>
                {result.isPending ? (
                  <>
                    <p className="text-2xl mb-2">⏳</p>
                    <h2 className="font-semibold text-lg">Request sent</h2>
                    <p className="text-sm text-gray-500 mt-1">Your teacher will review and confirm shortly.</p>
                  </>
                ) : (
                  <>
                    <p className="text-2xl mb-2">✓</p>
                    <h2 className="font-semibold text-lg">Lesson confirmed</h2>
                    <p className="text-sm text-gray-500 mt-1">
                      {formatLessonTime(selected)} has been added to your schedule.
                    </p>
                  </>
                )}
              </div>
              <button onClick={handleClose} className="w-full border rounded-lg py-2 text-sm hover:bg-gray-50">
                Done
              </button>
            </div>
          </div>
        )}
      </>
    )
  }

  return (
    <>
      <button onClick={handleOpen} className="text-sm text-blue-600 hover:text-blue-800 font-medium">
        + Add lesson
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6 space-y-5">
            <div>
              <h2 className="font-semibold text-lg">Add a lesson</h2>
              <p className="text-sm text-gray-500 mt-0.5">Pick a student and an available slot.</p>
            </div>

            {/* Student selector */}
            {students.length > 1 && (
              <div className="flex gap-2">
                {students.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => handleStudentChange(s.id)}
                    className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                      studentId === s.id ? 'bg-blue-600 text-white border-blue-600' : 'hover:bg-gray-50'
                    }`}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            )}

            {loading ? (
              <p className="text-sm text-gray-400 py-8 text-center">Loading available times…</p>
            ) : slots.length === 0 ? (
              <p className="text-sm text-gray-400 py-8 text-center">No available slots in the next 4 weeks.</p>
            ) : (
              <div className="flex gap-8">
                {/* Mini calendar */}
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
                          className={`w-9 h-9 flex items-center justify-center rounded-full text-sm transition-colors
                            ${isSelected ? 'bg-blue-600 text-white font-semibold'
                              : hasSlots ? 'text-blue-700 font-medium hover:bg-blue-50'
                              : isToday ? 'text-blue-300'
                              : 'text-gray-300 cursor-default'}`}
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
              <label className="block text-sm font-medium mb-1">Note <span className="text-gray-400 font-normal">(optional)</span></label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                className="w-full border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. make-up lesson, extra practice before recital…"
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex gap-3 justify-end">
              <button onClick={handleClose} className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5">
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={pending || loading || !selected}
                className="bg-blue-600 text-white rounded-lg px-4 py-1.5 text-sm hover:bg-blue-700 disabled:opacity-50"
              >
                {pending ? 'Booking…' : 'Book lesson'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
