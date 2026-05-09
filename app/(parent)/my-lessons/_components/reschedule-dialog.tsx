'use client'

import { useState, useTransition, useEffect } from 'react'
import { getAvailableSlots, rescheduleLesson } from './reschedule-actions'
import { formatLessonTime } from '@/lib/format-lesson-time'

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
  const [selected, setSelected] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()

  // Trigger slot fetch; all setState calls are inside the .then() callback (async)
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
    setSelected('')
    setNote('')
    setError('')
    setFetchKey((k) => k + 1)
  }

  function handleClose() {
    setOpen(false)
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
      <button
        onClick={handleOpen}
        className="text-xs text-blue-500 hover:text-blue-700 font-medium"
      >
        Reschedule
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <div>
              <h2 className="font-semibold">Reschedule lesson</h2>
              <p className="text-sm text-gray-500 mt-0.5">{formatLessonTime(scheduledAt)}</p>
            </div>

            <div>
              <p className="text-sm font-medium mb-2">Pick a new time</p>
              {loading ? (
                <p className="text-sm text-gray-400 py-4 text-center">Loading available times…</p>
              ) : slots.length === 0 ? (
                <p className="text-sm text-gray-400 py-4 text-center">No slots available in the next 4 weeks.</p>
              ) : (
                <div className="max-h-52 overflow-y-auto border rounded-lg divide-y">
                  {slots.map((slot) => (
                    <button
                      key={slot.scheduledAt}
                      onClick={() => setSelected(slot.scheduledAt)}
                      className={`w-full text-left px-3 py-2.5 text-sm transition-colors ${
                        selected === slot.scheduledAt
                          ? 'bg-blue-50 text-blue-700 font-medium'
                          : 'hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      {slot.displayTime}
                    </button>
                  ))}
                </div>
              )}
            </div>

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
              <button
                onClick={handleClose}
                className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5"
              >
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
