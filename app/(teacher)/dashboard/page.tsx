import { createClient } from '@/lib/supabase/server'
import { formatLessonTime } from '@/lib/format-lesson-time'
import Link from 'next/link'
import { addWeeks, startOfDay } from 'date-fns'

export default async function DashboardPage() {
  const supabase = await createClient()

  const now = new Date()
  const weekEnd = addWeeks(startOfDay(now), 1)

  const [{ data: upcomingLessons }, { count: studentCount }, { data: settings }] =
    await Promise.all([
      supabase
        .from('lessons')
        .select('id, scheduled_at, duration_minutes, status, students(name)')
        .eq('status', 'scheduled')
        .gte('scheduled_at', now.toISOString())
        .lte('scheduled_at', weekEnd.toISOString())
        .order('scheduled_at'),
      supabase.from('students').select('id', { count: 'exact', head: true }).eq('active', true),
      supabase.from('teacher_settings').select('ical_token').single(),
    ])

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const icalUrl = settings?.ical_token
    ? `${appUrl}/api/ical/${settings.ical_token}`.replace(/^https?:\/\//, 'webcal://')
    : null

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">{studentCount ?? 0} active students</p>
      </div>

      <section>
        <h2 className="text-lg font-medium mb-3">This week</h2>
        {!upcomingLessons?.length ? (
          <p className="text-gray-400 text-sm">No lessons scheduled this week.</p>
        ) : (
          <div className="bg-white rounded-xl border divide-y">
            {upcomingLessons.map((lesson) => (
              <div key={lesson.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="font-medium text-sm">
                    {(lesson.students as { name: string } | null)?.name ?? '—'}
                  </p>
                  <p className="text-gray-500 text-xs">
                    {formatLessonTime(lesson.scheduled_at)} · {lesson.duration_minutes} min
                  </p>
                </div>
                <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                  scheduled
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {icalUrl && (
        <section>
          <h2 className="text-lg font-medium mb-2">Calendar feed</h2>
          <p className="text-gray-500 text-sm mb-2">
            Subscribe in Apple Calendar to see all scheduled lessons.
          </p>
          <div className="flex items-center gap-3">
            <code className="text-xs bg-gray-100 px-3 py-2 rounded-lg break-all">{icalUrl}</code>
            <a
              href={icalUrl}
              className="shrink-0 text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700"
            >
              Open in Calendar
            </a>
          </div>
        </section>
      )}

      <section className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[
          { href: '/families', label: 'Manage families' },
          { href: '/assignments', label: 'Recurring assignments' },
          { href: '/availability', label: 'Availability windows' },
          { href: '/blackouts', label: 'Blackout dates' },
          { href: '/lessons', label: 'All lessons' },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="bg-white rounded-xl border px-4 py-4 text-sm font-medium hover:border-blue-400 transition-colors"
          >
            {item.label} →
          </Link>
        ))}
      </section>
    </div>
  )
}
