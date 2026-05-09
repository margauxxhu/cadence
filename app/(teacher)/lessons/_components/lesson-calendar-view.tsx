'use client'

import { useState, useMemo, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toZonedTime } from 'date-fns-tz'
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addDays, addMonths, subMonths, format, isSameMonth,
} from 'date-fns'
import { formatLessonTime } from '@/lib/format-lesson-time'
import { markLessonCompleted } from './lesson-actions'

const TZ = 'America/Los_Angeles'

type LessonStatus = 'scheduled' | 'completed' | 'cancelled' | 'rescheduled' | 'pending'

interface Lesson {
  id: string
  student_id: string
  scheduled_at: string
  duration_minutes: number
  status: LessonStatus
  note: string | null
  late_cancel: boolean
  students: { name: string; families: { parent_name: string } | null } | null
}

interface Semester {
  id: string
  start_date: string
  end_date: string
}

interface Props {
  lessons: Lesson[]
  students: { id: string; name: string }[]
  semesters: Semester[]
}

// Each palette entry must appear as full literal strings so Tailwind includes them
const PALETTE = [
  { bg: 'bg-blue-100',    text: 'text-blue-800',    dot: 'bg-blue-400'    },
  { bg: 'bg-emerald-100', text: 'text-emerald-800', dot: 'bg-emerald-400' },
  { bg: 'bg-purple-100',  text: 'text-purple-800',  dot: 'bg-purple-400'  },
  { bg: 'bg-orange-100',  text: 'text-orange-800',  dot: 'bg-orange-400'  },
  { bg: 'bg-pink-100',    text: 'text-pink-800',    dot: 'bg-pink-400'    },
  { bg: 'bg-teal-100',    text: 'text-teal-800',    dot: 'bg-teal-400'    },
  { bg: 'bg-amber-100',   text: 'text-amber-800',   dot: 'bg-amber-400'   },
  { bg: 'bg-rose-100',    text: 'text-rose-800',    dot: 'bg-rose-400'    },
  { bg: 'bg-indigo-100',  text: 'text-indigo-800',  dot: 'bg-indigo-400'  },
  { bg: 'bg-cyan-100',    text: 'text-cyan-800',    dot: 'bg-cyan-400'    },
  { bg: 'bg-lime-100',    text: 'text-lime-800',    dot: 'bg-lime-400'    },
  { bg: 'bg-fuchsia-100', text: 'text-fuchsia-800', dot: 'bg-fuchsia-400' },
]

const STATUS_BADGE: Record<string, string> = {
  scheduled:   'bg-blue-50 text-blue-700',
  completed:   'bg-green-50 text-green-700',
  cancelled:   'bg-red-50 text-red-600',
  rescheduled: 'bg-amber-50 text-amber-700',
  pending:     'bg-purple-50 text-purple-700',
}

const STATUS_LABELS: Record<string, string> = {
  all:         'All',
  scheduled:   'Scheduled',
  completed:   'Completed',
  cancelled:   'Cancelled',
  rescheduled: 'Rescheduled',
  pending:     'Pending',
  late_cancel: 'Late cancels',
}

function toLADateKey(iso: string | Date): string {
  const d = toZonedTime(new Date(iso as string), TZ)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function semesterLabel(s: Semester): string {
  const month = parseInt(s.start_date.slice(5, 7), 10)
  const year = s.start_date.slice(0, 4)
  if (month <= 5) return `Spring ${year}`
  if (month <= 8) return `Summer ${year}`
  return `Fall ${year}`
}

export function LessonCalendarView({ lessons, students, semesters }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()))
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState('all')
  const [markedDone, setMarkedDone] = useState<Set<string>>(new Set())

  // student id → palette
  const colorMap = useMemo(() => {
    const map = new Map<string, typeof PALETTE[number]>()
    students.forEach((s, i) => map.set(s.id, PALETTE[i % PALETTE.length]))
    return map
  }, [students])

  function color(studentId: string) {
    return colorMap.get(studentId) ?? PALETTE[0]
  }

  // Filter lessons
  const filtered = useMemo(() => {
    return lessons.filter((l) => {
      if (markedDone.has(l.id)) return false
      if (statusFilter === 'late_cancel') return l.late_cancel
      if (statusFilter !== 'all' && l.status !== statusFilter) return false
      return true
    })
  }, [lessons, statusFilter, markedDone])

  // Group by LA date key for calendar dots
  const byDay = useMemo(() => {
    const map = new Map<string, Lesson[]>()
    for (const l of filtered) {
      const key = toLADateKey(l.scheduled_at)
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(l)
    }
    return map
  }, [filtered])

  // Calendar grid cells
  const calendarDays = useMemo(() => {
    const gridStart = startOfWeek(startOfMonth(currentMonth))
    const gridEnd = endOfWeek(endOfMonth(currentMonth))
    const days: Date[] = []
    let d = gridStart
    while (d <= gridEnd) {
      days.push(d)
      d = addDays(d, 1)
    }
    return days
  }, [currentMonth])

  const weeks = Math.ceil(calendarDays.length / 7)

  // List pane: selected day or full current month
  const listLessons = useMemo(() => {
    const base = selectedDay
      ? filtered.filter((l) => toLADateKey(l.scheduled_at) === selectedDay)
      : filtered.filter((l) => toLADateKey(l.scheduled_at).startsWith(format(currentMonth, 'yyyy-MM')))
    return base.sort((a, b) => b.scheduled_at.localeCompare(a.scheduled_at))
  }, [filtered, selectedDay, currentMonth])

  const groupedList = useMemo(() => {
    const map = new Map<string, { label: string; lessons: Lesson[] }>()
    for (const l of listLessons) {
      const key = toLADateKey(l.scheduled_at)
      if (!map.has(key)) map.set(key, { label: formatLessonTime(l.scheduled_at, 'date'), lessons: [] })
      map.get(key)!.lessons.push(l)
    }
    return [...map.entries()].sort(([a], [b]) => b.localeCompare(a))
  }, [listLessons])

  function handleMarkDone(id: string) {
    startTransition(async () => {
      await markLessonCompleted(id)
      setMarkedDone((prev) => new Set(prev).add(id))
      router.refresh()
    })
  }

  const todayKey = toLADateKey(new Date().toISOString())
  const sortedSemesters = [...semesters].sort((a, b) => b.start_date.localeCompare(a.start_date))

  return (
    <div className="flex gap-5 items-start">

      {/* ── Left sidebar ────────────────────────────── */}
      <div className="w-40 shrink-0 space-y-6">

        <div>
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">
            Semester
          </p>
          <div className="space-y-1">
            {sortedSemesters.length === 0 ? (
              <p className="text-xs text-gray-400 px-1">No periods set</p>
            ) : (
              sortedSemesters.map((s) => {
                const monthStr = format(currentMonth, 'yyyy-MM')
                const isActive = monthStr >= s.start_date.slice(0, 7) && monthStr <= s.end_date.slice(0, 7)
                return (
                  <button
                    key={s.id}
                    onClick={() => {
                      setCurrentMonth(startOfMonth(new Date(s.start_date + 'T12:00:00')))
                      setSelectedDay(null)
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                      isActive
                        ? 'bg-stone-900 text-white'
                        : 'text-gray-600 hover:bg-white hover:shadow-sm'
                    }`}
                  >
                    <span className="font-medium block leading-tight">{semesterLabel(s)}</span>
                    <span className={`text-[10px] mt-0.5 block ${isActive ? 'opacity-60' : 'text-gray-400'}`}>
                      {s.start_date.slice(0, 7).replace('-', '/')}
                      {' – '}
                      {s.end_date.slice(0, 7).replace('-', '/')}
                    </span>
                  </button>
                )
              })
            )}
          </div>
        </div>

        <div>
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">
            Status
          </p>
          <div className="space-y-0.5">
            {Object.entries(STATUS_LABELS).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setStatusFilter(key)}
                className={`w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  statusFilter === key
                    ? 'bg-stone-900 text-white'
                    : 'text-gray-600 hover:bg-white hover:shadow-sm'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Calendar ─────────────────────────────────── */}
      <div className="flex-1 min-w-0 bg-white rounded-xl border flex flex-col">

        {/* Month nav */}
        <div className="flex items-center justify-between px-5 py-3 border-b">
          <button
            onClick={() => { setCurrentMonth(m => subMonths(m, 1)); setSelectedDay(null) }}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 text-xl leading-none transition-colors"
          >
            ‹
          </button>
          <p className="text-sm font-semibold">{format(currentMonth, 'MMMM yyyy')}</p>
          <button
            onClick={() => { setCurrentMonth(m => addMonths(m, 1)); setSelectedDay(null) }}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 text-xl leading-none transition-colors"
          >
            ›
          </button>
        </div>

        {/* Day-of-week header */}
        <div className="grid grid-cols-7 border-b">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <div key={d} className="py-2 text-center text-xs font-medium text-gray-400">{d}</div>
          ))}
        </div>

        {/* Day cells */}
        <div
          className="grid grid-cols-7 divide-x divide-y"
          style={{ gridTemplateRows: `repeat(${weeks}, minmax(88px, auto))` }}
        >
          {calendarDays.map((day) => {
            const key = format(day, 'yyyy-MM-dd')
            const inMonth = isSameMonth(day, currentMonth)
            const isToday = key === todayKey
            const isSelected = key === selectedDay
            const dayLessons = byDay.get(key) ?? []
            const visible = dayLessons.slice(0, 4)
            const overflow = dayLessons.length - 4

            return (
              <div
                key={key}
                onClick={() => setSelectedDay(isSelected ? null : key)}
                className={`p-1.5 cursor-pointer transition-colors overflow-hidden ${
                  isSelected
                    ? 'bg-stone-50 ring-2 ring-inset ring-stone-900'
                    : !inMonth
                    ? 'bg-gray-50/60'
                    : 'hover:bg-gray-50'
                }`}
              >
                <div className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full mb-1 ${
                  isToday
                    ? 'bg-stone-900 text-white'
                    : inMonth
                    ? 'text-gray-700'
                    : 'text-gray-300'
                }`}>
                  {format(day, 'd')}
                </div>

                <div className="space-y-[3px]">
                  {visible.map((l) => {
                    const c = color(l.student_id)
                    const firstName = (l.students?.name ?? '—').split(' ')[0]
                    return (
                      <div
                        key={l.id}
                        title={`${l.students?.name ?? '—'} · ${formatLessonTime(l.scheduled_at, 'time')}`}
                        className={`text-[10px] leading-snug px-1.5 py-[1px] rounded font-medium truncate ${c.bg} ${c.text} ${
                          l.status === 'cancelled' ? 'opacity-35 line-through' : ''
                        } ${l.status === 'completed' ? 'opacity-60' : ''}`}
                      >
                        {firstName}
                      </div>
                    )
                  })}
                  {overflow > 0 && (
                    <p className="text-[10px] text-gray-400 pl-1">+{overflow} more</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Lesson list ──────────────────────────────── */}
      <div className="w-72 shrink-0 space-y-3">
        <div className="flex items-center gap-2 px-0.5">
          <p className="text-sm font-medium text-gray-700 flex-1">
            {selectedDay
              ? format(new Date(selectedDay + 'T12:00:00'), 'MMMM d')
              : format(currentMonth, 'MMMM')}
            <span className="text-gray-400 font-normal ml-1.5">
              {listLessons.length} lesson{listLessons.length !== 1 ? 's' : ''}
            </span>
          </p>
          {selectedDay && (
            <button
              onClick={() => setSelectedDay(null)}
              className="text-[11px] text-gray-400 hover:text-gray-700 underline shrink-0"
            >
              Show month
            </button>
          )}
        </div>

        {groupedList.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-16">No lessons.</p>
        ) : (
          <div className="space-y-4">
            {groupedList.map(([dateKey, { label, lessons: dayLessons }]) => (
              <div key={dateKey}>
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5 px-0.5">
                  {label}
                </p>
                <div className="bg-white rounded-xl border divide-y">
                  {dayLessons.map((l) => {
                    const c = color(l.student_id)
                    const name = l.students?.name ?? '—'
                    return (
                      <div key={l.id} className="px-3 py-2.5">
                        <div className="flex items-start gap-2">
                          <div className={`mt-1 shrink-0 w-2 h-2 rounded-full ${c.dot}`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="text-xs font-semibold leading-tight truncate">{name}</p>
                              {l.late_cancel && (
                                <span className="text-[10px] text-orange-600 font-medium shrink-0">⚠ late</span>
                              )}
                            </div>
                            <p className="text-[11px] text-gray-400 mt-0.5">
                              {formatLessonTime(l.scheduled_at, 'time')} · {l.duration_minutes} min
                            </p>
                            {l.note && (
                              <p className="text-[10px] text-gray-400 mt-0.5 italic truncate">
                                "{l.note}"
                              </p>
                            )}
                          </div>
                          <div className="shrink-0 flex flex-col items-end gap-1.5">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full whitespace-nowrap ${STATUS_BADGE[l.status] ?? ''}`}>
                              {l.status}
                            </span>
                            {l.status === 'scheduled' && (
                              <button
                                onClick={() => handleMarkDone(l.id)}
                                disabled={isPending}
                                className="text-[10px] text-gray-400 hover:text-green-600 disabled:opacity-40 transition-colors"
                              >
                                done
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
