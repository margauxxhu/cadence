'use client'

import { useState } from 'react'
import { toZonedTime } from 'date-fns-tz'
import { CalendarView } from './calendar-view'
import { CancelDialog } from './cancel-dialog'
import { RescheduleDialog } from './reschedule-dialog'
import { formatLessonTime } from '@/lib/format-lesson-time'

const TZ = 'America/Los_Angeles'

interface Lesson {
  id: string
  scheduled_at: string
  duration_minutes: number
  status: string
  students: { name: string } | null
}

interface Props {
  lessons: Lesson[]
  parentName: string
}

function toLADateStr(scheduledAt: string): string {
  const la = toZonedTime(new Date(scheduledAt), TZ)
  return `${la.getFullYear()}-${String(la.getMonth() + 1).padStart(2, '0')}-${String(la.getDate()).padStart(2, '0')}`
}

export function ParentDashboard({ lessons: initial, parentName }: Props) {
  const todayLA = toZonedTime(new Date(), TZ)
  const [year, setYear] = useState(todayLA.getFullYear())
  const [month, setMonth] = useState(todayLA.getMonth())
  const [lessons, setLessons] = useState(initial)

  const lessonDates = new Set<string>(lessons.map((l) => toLADateStr(l.scheduled_at)))

  const monthLessons = lessons.filter((l) => {
    const la = toZonedTime(new Date(l.scheduled_at), TZ)
    return la.getFullYear() === year && la.getMonth() === month
  })

  function removeLesson(id: string) {
    setLessons((prev) => prev.filter((l) => l.id !== id))
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">My Lessons</h1>
        <p className="text-gray-500 text-sm mt-1">Hi, {parentName}</p>
      </div>

      <div className="flex gap-4 items-start">
        {/* Calendar — 75% */}
        <div className="flex-[3] min-w-0">
          <CalendarView
            lessonDates={lessonDates}
            year={year}
            month={month}
            onMonthChange={(y, m) => { setYear(y); setMonth(m) }}
          />
        </div>

        {/* Month lesson list — 25% */}
        <div className="w-64 shrink-0">
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <p className="text-sm font-semibold text-gray-700 mb-3">
              {monthLessons.length > 0
                ? `${monthLessons.length} lesson${monthLessons.length !== 1 ? 's' : ''}`
                : 'No lessons'}
            </p>

            {monthLessons.length === 0 ? (
              <p className="text-xs text-gray-400">Nothing scheduled this month.</p>
            ) : (
              <div className="space-y-2">
                {monthLessons.map((lesson) => (
                  <div key={lesson.id} className="border rounded-xl p-3 space-y-1">
                    <p className="text-sm font-medium leading-tight">{lesson.students?.name ?? '—'}</p>
                    <p className="text-xs text-gray-500">
                      {formatLessonTime(lesson.scheduled_at, 'short')} · {lesson.duration_minutes} min
                    </p>
                    <div className="flex gap-3 pt-0.5">
                      <RescheduleDialog
                        lessonId={lesson.id}
                        scheduledAt={lesson.scheduled_at}
                        onRescheduled={() => removeLesson(lesson.id)}
                      />
                      <CancelDialog
                        lessonId={lesson.id}
                        scheduledAt={lesson.scheduled_at}
                        onCancelled={() => removeLesson(lesson.id)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
