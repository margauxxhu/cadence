import { createClient } from '@/lib/supabase/server'
import { PeriodCard } from './_components/period-card'
import { PeriodForm } from './_components/period-form'
import { BlackoutSection } from './_components/blackout-section'

export default async function AvailabilityPage() {
  const supabase = await createClient()

  const [{ data: periods }, { data: blackouts }] = await Promise.all([
    supabase
      .from('availability_periods')
      .select('id, name, start_date, end_date, availability_windows(id, weekday, start_time, end_time), period_exceptions(id, exception_date, reason)')
      .order('start_date'),
    supabase
      .from('blackouts')
      .select('id, start_date, end_date, reason')
      .order('start_date'),
  ])

  return (
    <div className="space-y-10">
      {/* Availability periods */}
      <section className="space-y-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Availability</h1>
          <p className="text-sm text-gray-500 mt-1">
            Define which days and times you&apos;re available each semester. Add day exceptions for individual days off within a period.
          </p>
        </div>

        {(!periods || periods.length === 0) && (
          <p className="text-sm text-gray-400">No periods yet. Create one to get started.</p>
        )}

        {periods?.map((p) => (
          <PeriodCard key={p.id} period={p as Parameters<typeof PeriodCard>[0]['period']} />
        ))}

        <PeriodForm />
      </section>

      {/* Holiday blackouts */}
      <BlackoutSection blackouts={blackouts ?? []} />
    </div>
  )
}
