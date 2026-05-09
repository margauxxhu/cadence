'use client'

import { useState, useTransition } from 'react'
import { cancelLesson } from './cancel-actions'
import { formatLessonTime } from '@/lib/format-lesson-time'

interface Props {
  lessonId: string
  scheduledAt: string
  onCancelled: () => void
}

export function CancelDialog({ lessonId, scheduledAt, onCancelled }: Props) {
  const [open, setOpen] = useState(false)
  const [note, setNote] = useState('')
  const [warning, setWarning] = useState('')
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()

  function handleCancel() {
    setError('')
    setWarning('')
    if (!note.trim()) {
      setError('Please add a note explaining the cancellation.')
      return
    }
    startTransition(async () => {
      const result = await cancelLesson(lessonId, note)
      if (result.error) {
        setError(result.error)
        return
      }
      if (result.wasLate) {
        setWarning('This lesson is within 24 hours. Your teacher has been notified of the late cancellation.')
      }
      setOpen(false)
      onCancelled()
    })
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-red-500 hover:text-red-700 font-medium"
      >
        Cancel
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h2 className="font-semibold">Cancel lesson</h2>
            <p className="text-sm text-gray-500">
              {formatLessonTime(scheduledAt)}
            </p>
            <div>
              <label className="block text-sm font-medium mb-1">
                Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                className="w-full border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Brief explanation…"
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            {warning && (
              <p className="text-sm text-yellow-700 bg-yellow-50 rounded-lg px-3 py-2">
                ⚠ {warning}
              </p>
            )}
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => { setOpen(false); setNote(''); setError(''); setWarning('') }}
                className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5"
              >
                Keep lesson
              </button>
              <button
                onClick={handleCancel}
                disabled={pending}
                className="bg-red-600 text-white rounded-lg px-4 py-1.5 text-sm hover:bg-red-700 disabled:opacity-50"
              >
                {pending ? 'Cancelling…' : 'Confirm cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
