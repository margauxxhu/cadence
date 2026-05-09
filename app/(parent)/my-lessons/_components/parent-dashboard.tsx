'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toZonedTime } from 'date-fns-tz'
import { CalendarView } from './calendar-view'
import { CancelDialog } from './cancel-dialog'
import { RescheduleDialog } from './reschedule-dialog'
import { AddLessonDialog } from './add-lesson-dialog'
import { formatLessonTime } from '@/lib/format-lesson-time'

const TZ = 'America/Los_Angeles'

interface Lesson {
  id: string
  scheduled_at: string
  duration_minutes: number
  status: string
  students: { name: string } | null
}

interface Student { id: string; name: string }

interface Props {
  lessons: Lesson[]
  parentName: string
  conflictedIds: string[]
  students: Student[]
}

function toLADateStr(scheduledAt: string): string {
  const la = toZonedTime(new Date(scheduledAt), TZ)
  return `${la.getFullYear()}-${String(la.getMonth() + 1).padStart(2, '0')}-${String(la.getDate()).padStart(2, '0')}`
}

export function ParentDashboard({ lessons: initial, parentName, conflictedIds, students }: Props) {
  const router = useRouter()
  const todayLA = toZonedTime(new Date(), TZ)
  const [year, setYear] = useState(todayLA.getFullYear())
  const [month, setMonth] = useState(todayLA.getMonth())
  const [lessons, setLessons] = useState(initial)

  // Sync local state when server re-fetches after router.refresh()
  useEffect(() => { setLessons(initial) }, [initial])

  const conflictedSet = new Set(conflictedIds)

  // All lesson dates → blue dots; conflicted dates → amber dots (amber takes priority in CalendarView)
  const lessonDates = new Set<string>(lessons.map((l) => toLADateStr(l.scheduled_at)))
  const conflictedDates = new Set<string>(
    lessons.filter((l) => conflictedSet.has(l.id)).map((l) => toLADateStr(l.scheduled_at))
  )

  const monthLessons = lessons.filter((l) => {
    const la = toZonedTime(new Date(l.scheduled_at), TZ)
    return la.getFullYear() === year && la.getMonth() === month
  })

  const conflictsThisMonth = monthLessons.filter((l) => conflictedSet.has(l.id)).length

  function removeLesson(id: string) {
    setLessons((prev) => prev.filter((l) => l.id !== id))
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-semibold">My Lessons</h1>
          <p className="text-gray-500 text-sm mt-1">Hi, {parentName}</p>
        </div>
        <AddLessonDialog students={students} onAdded={() => router.refresh()} />
      </div>

      <div className="flex gap-4 items-start">
        {/* Calendar — 75% */}
        <div className="flex-[3] min-w-0">
          <CalendarView
            lessonDates={lessonDates}
            conflictedDates={conflictedDates}
            year={year}
            month={month}
            onMonthChange={(y, m) => { setYear(y); setMonth(m) }}
          />
        </div>

        {/* Month lesson list — 25% */}
        <div className="w-80 shrink-0">
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-gray-700">
                {monthLessons.length > 0
                  ? `${monthLessons.length} lesson${monthLessons.length !== 1 ? 's' : ''}`
                  : 'No lessons'}
              </p>
              {conflictsThisMonth > 0 && (
                <span className="text-xs font-medium text-amber-700 bg-amber-100 rounded-full px-2 py-0.5">
                  {conflictsThisMonth} conflict{conflictsThisMonth !== 1 ? 's' : ''}
                </span>
              )}
            </div>

            {monthLessons.length === 0 ? (
              <p className="text-xs text-gray-400">Nothing scheduled this month.</p>
            ) : (
              <div className="space-y-2">
                {monthLessons.map((lesson) => {
                  const isConflicted = conflictedSet.has(lesson.id)
                  return (
                    <div
                      key={lesson.id}
                      className={`rounded-xl p-3 space-y-1.5 ${
                        lesson.status === 'pending'
                          ? 'border border-blue-200 bg-blue-50/40'
                          : isConflicted
                          ? 'border border-amber-300 bg-amber-50/50'
                          : 'border'
                      }`}
                    >
                      <p className="text-sm font-medium leading-tight">
                        {lesson.students?.name ?? '—'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatLessonTime(lesson.scheduled_at, 'short')} · {lesson.duration_minutes} min
                      </p>
                      {lesson.status === 'pending' && (
                        <p className="text-xs text-blue-600 font-medium">⏳ Awaiting teacher confirmation</p>
                      )}
                      {isConflicted && lesson.status !== 'pending' && (
                        <p className="text-xs text-amber-700 font-medium">
                          ⚠ Teacher unavailable — please reschedule
                        </p>
                      )}
                      {lesson.status !== 'pending' && (
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
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
