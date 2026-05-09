'use client'

import { useTransition, useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatLessonTime } from '@/lib/format-lesson-time'
import { approveLesson, declineLesson } from './pending-actions'

interface PendingLesson {
  id: string
  scheduled_at: string
  duration_minutes: number
  note: string | null
  students: { name: string } | null
}

export function PendingRequests({ lessons }: { lessons: PendingLesson[] }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [actioned, setActioned] = useState<Set<string>>(new Set())

  function handle(lessonId: string, action: 'approve' | 'decline') {
    startTransition(async () => {
      const fn = action === 'approve' ? approveLesson : declineLesson
      await fn(lessonId)
      setActioned((prev) => new Set(prev).add(lessonId))
      router.refresh()
    })
  }

  const visible = lessons.filter((l) => !actioned.has(l.id))
  if (!visible.length) return null

  return (
    <section>
      <h2 className="text-lg font-medium mb-3">
        Pending requests
        <span className="ml-2 text-sm font-normal text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
          {visible.length}
        </span>
      </h2>
      <div className="bg-white rounded-xl border divide-y">
        {visible.map((lesson) => (
          <div key={lesson.id} className="flex items-center justify-between px-4 py-3 gap-4">
            <div className="min-w-0">
              <p className="font-medium text-sm">
                {(lesson.students as { name: string } | null)?.name ?? '—'}
                <span className="ml-2 text-xs text-amber-600 font-normal">trial</span>
              </p>
              <p className="text-gray-500 text-xs">
                {formatLessonTime(lesson.scheduled_at)} · {lesson.duration_minutes} min
              </p>
              {lesson.note && (
                <p className="text-xs text-gray-400 mt-0.5 truncate">"{lesson.note}"</p>
              )}
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => handle(lesson.id, 'approve')}
                disabled={pending}
                className="text-xs bg-blue-600 text-white rounded-lg px-3 py-1.5 hover:bg-blue-700 disabled:opacity-50"
              >
                Approve
              </button>
              <button
                onClick={() => handle(lesson.id, 'decline')}
                disabled={pending}
                className="text-xs border text-gray-600 rounded-lg px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50"
              >
                Decline
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
