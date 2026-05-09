import { createClient } from '@/lib/supabase/server'
import { formatLessonTime } from '@/lib/format-lesson-time'
import { markLessonCompleted } from './_components/lesson-actions'
import { subWeeks } from 'date-fns'

const STATUS_STYLES: Record<string, string> = {
  scheduled: 'bg-blue-50 text-blue-700',
  completed: 'bg-green-50 text-green-700',
  cancelled: 'bg-red-50 text-red-600',
  rescheduled: 'bg-yellow-50 text-yellow-700',
}

export default async function LessonsPage() {
  const supabase = await createClient()

  const { data: lessons } = await supabase
    .from('lessons')
    .select('*, students(name, families(parent_name))')
    .gte('scheduled_at', subWeeks(new Date(), 4).toISOString())
    .order('scheduled_at', { ascending: false })
    .limit(200)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Lesson History</h1>

      <div className="bg-white rounded-xl border divide-y">
        {!lessons?.length ? (
          <p className="px-4 py-6 text-gray-400 text-sm">No lessons found.</p>
        ) : (
          lessons.map((l) => {
            const student = l.students as { name: string; families: { parent_name: string } | null } | null
            return (
              <div key={l.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium">
                    {student?.name ?? '—'}
                    <span className="ml-1 text-xs text-gray-400">({student?.families?.parent_name})</span>
                  </p>
                  <p className="text-xs text-gray-500">{formatLessonTime(l.scheduled_at)} · {l.duration_minutes} min</p>
                  {l.note && <p className="text-xs text-gray-400 mt-0.5 italic">{l.note}</p>}
                  {l.late_cancel && (
                    <span className="text-xs text-orange-500">⚠ Late cancel</span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_STYLES[l.status] ?? ''}`}>
                    {l.status}
                  </span>
                  {l.status === 'scheduled' && (
                    <form action={markLessonCompleted.bind(null, l.id)}>
                      <button className="text-xs text-gray-400 hover:text-green-600">
                        Mark done
                      </button>
                    </form>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
