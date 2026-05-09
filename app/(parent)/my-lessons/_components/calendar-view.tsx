'use client'

import { toZonedTime } from 'date-fns-tz'
import { addMonths, subMonths, getDaysInMonth } from 'date-fns'

const TZ = 'America/Los_Angeles'
const DAY_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

interface Props {
  lessonDates: Set<string>      // 'yyyy-MM-dd' — all scheduled lessons
  conflictedDates?: Set<string> // subset of lessonDates with teacher conflicts
  year: number
  month: number                 // 0-indexed
  onMonthChange: (year: number, month: number) => void
}

export function CalendarView({ lessonDates, conflictedDates, year, month, onMonthChange }: Props) {
  const firstOfMonth = new Date(year, month, 1)
  const startWeekday = firstOfMonth.getDay()
  const daysInMonth = getDaysInMonth(firstOfMonth)

  const todayLA = toZonedTime(new Date(), TZ)
  const todayYear = todayLA.getFullYear()
  const todayMonth = todayLA.getMonth()
  const todayDate = todayLA.getDate()

  function pad(n: number) { return String(n).padStart(2, '0') }

  function goToPrev() {
    const d = subMonths(firstOfMonth, 1)
    onMonthChange(d.getFullYear(), d.getMonth())
  }

  function goToNext() {
    const d = addMonths(firstOfMonth, 1)
    onMonthChange(d.getFullYear(), d.getMonth())
  }

  const cells: (number | null)[] = [
    ...Array(startWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  return (
    <div className="bg-white rounded-2xl p-8 shadow-sm select-none">
      {/* Month / year header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={goToPrev}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 text-lg"
        >
          ‹
        </button>
        <h2 className="text-base font-semibold text-gray-900 tracking-tight">
          {MONTH_NAMES[month]} {year}
        </h2>
        <button
          onClick={goToNext}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 text-lg"
        >
          ›
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_HEADERS.map((d) => (
          <div key={d} className="text-center text-xs font-medium text-gray-400 py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7">
        {cells.map((day, i) => {
          if (day === null) return <div key={i} />

          const dateStr = `${year}-${pad(month + 1)}-${pad(day)}`
          const isToday = year === todayYear && month === todayMonth && day === todayDate
          const hasConflict = conflictedDates?.has(dateStr) ?? false
          const hasLesson = lessonDates.has(dateStr)

          // Dot color: amber for conflicts, blue for normal lessons
          const dotColor = hasConflict
            ? (isToday ? 'bg-amber-400' : 'bg-amber-500')
            : (isToday ? 'bg-blue-300' : 'bg-blue-500')

          return (
            <div key={i} className="flex flex-col items-center py-2">
              <div
                className={`
                  w-10 h-10 flex items-center justify-center rounded-full text-sm transition-colors
                  ${isToday ? 'bg-blue-600 text-white font-semibold' : 'text-gray-800'}
                `}
              >
                {day}
              </div>
              <div className={`h-1.5 ${(hasLesson || hasConflict) ? 'opacity-100' : 'opacity-0'}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
