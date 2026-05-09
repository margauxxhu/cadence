'use client'

import { useState } from 'react'
import { CancelDialog } from './cancel-dialog'
import { formatLessonTime } from '@/lib/format-lesson-time'

interface Lesson {
  id: string
  scheduled_at: string
  duration_minutes: number
  status: string
  students: { name: string } | null
}

export function LessonsList({ lessons: initial }: { lessons: Lesson[] }) {
  const [lessons, setLessons] = useState(initial)

  function handleCancelled(id: string) {
    setLessons((prev) => prev.filter((l) => l.id !== id))
  }

  if (!lessons.length) {
    return <p className="text-gray-400 text-sm">No upcoming lessons.</p>
  }

  return (
    <div className="bg-white rounded-xl border divide-y">
      {lessons.map((lesson) => (
        <div key={lesson.id} className="flex items-center justify-between px-4 py-4">
          <div>
            <p className="text-sm font-medium">
              {lesson.students?.name ?? '—'}
            </p>
            <p className="text-xs text-gray-500">
              {formatLessonTime(lesson.scheduled_at)} · {lesson.duration_minutes} min
            </p>
          </div>
          <CancelDialog
            lessonId={lesson.id}
            scheduledAt={lesson.scheduled_at}
            onCancelled={() => handleCancelled(lesson.id)}
          />
        </div>
      ))}
    </div>
  )
}
