import ical from 'ical-generator'
import { createClient } from '@supabase/supabase-js'
import { addMonths, subWeeks } from 'date-fns'
import type { Database } from '@/types/supabase'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000)
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ teacher_token: string }> }
) {
  const { teacher_token } = await params

  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: settings } = await supabase
    .from('teacher_settings')
    .select('ical_token')
    .eq('ical_token', teacher_token)
    .single()

  if (!settings) {
    return new Response('Not found', { status: 404 })
  }

  const from = subWeeks(new Date(), 4)
  const to = addMonths(new Date(), 6)

  const { data: lessons } = await supabase
    .from('lessons')
    .select('id, scheduled_at, duration_minutes, students(name)')
    .eq('status', 'scheduled')
    .gte('scheduled_at', from.toISOString())
    .lte('scheduled_at', to.toISOString())
    .order('scheduled_at')

  const cal = ical({ name: 'Cadence — Piano Lessons' })

  for (const lesson of lessons ?? []) {
    const start = new Date(lesson.scheduled_at)
    const end = addMinutes(start, lesson.duration_minutes)
    const student = lesson.students as { name: string } | null
    cal.createEvent({
      id: lesson.id,
      start,
      end,
      summary: `Piano — ${student?.name ?? 'Student'}`,
      timezone: 'America/Los_Angeles',
    })
  }

  return new Response(cal.toString(), {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="cadence.ics"',
      'Cache-Control': 'no-store',
    },
  })
}
