'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

function refresh() {
  revalidatePath('/availability')
}

// ── Periods ────────────────────────────────────────────────────────────────

const PeriodSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

export async function createPeriodWithSchedule(
  name: string,
  start_date: string,
  end_date: string,
  days: { weekday: number; start_time: string; end_time: string }[]
): Promise<{ error?: string }> {
  const parsed = PeriodSchema.safeParse({ name, start_date, end_date })
  if (!parsed.success) return { error: parsed.error.issues[0].message }
  if (parsed.data.end_date < parsed.data.start_date) return { error: 'End date must be after start date' }

  const supabase = await createClient()
  const { data: period, error: pErr } = await supabase
    .from('availability_periods')
    .insert(parsed.data)
    .select('id')
    .single()
  if (pErr || !period) return { error: pErr?.message ?? 'Failed to create period' }

  if (days.length > 0) {
    const { error: wErr } = await supabase.from('availability_windows').insert(
      days.map((d) => ({ period_id: period.id, ...d }))
    )
    if (wErr) return { error: wErr.message }
  }

  refresh()
  return {}
}

export async function updatePeriod(
  id: string,
  name: string,
  start_date: string,
  end_date: string
): Promise<{ error?: string }> {
  const parsed = PeriodSchema.safeParse({ name, start_date, end_date })
  if (!parsed.success) return { error: parsed.error.issues[0].message }
  if (parsed.data.end_date < parsed.data.start_date) return { error: 'End date must be after start date' }

  const supabase = await createClient()
  const { error } = await supabase.from('availability_periods').update(parsed.data).eq('id', id)
  if (error) return { error: error.message }
  refresh()
  return {}
}

export async function deletePeriod(id: string): Promise<void> {
  const supabase = await createClient()
  await supabase.from('availability_periods').delete().eq('id', id)
  refresh()
}

// ── Windows ────────────────────────────────────────────────────────────────

const WindowSchema = z.object({
  period_id: z.string().uuid(),
  weekday: z.number().int().min(0).max(6),
  start_time: z.string().regex(/^\d{2}:\d{2}$/),
  end_time: z.string().regex(/^\d{2}:\d{2}$/),
})

export async function addWindow(
  period_id: string,
  weekday: number,
  start_time: string,
  end_time: string
): Promise<{ error?: string }> {
  const parsed = WindowSchema.safeParse({ period_id, weekday, start_time, end_time })
  if (!parsed.success) return { error: parsed.error.issues[0].message }
  if (parsed.data.end_time <= parsed.data.start_time) return { error: 'End time must be after start time' }

  const supabase = await createClient()
  const { error } = await supabase.from('availability_windows').insert(parsed.data)
  if (error) return { error: error.message }
  refresh()
  return {}
}

export async function updateWindow(
  id: string,
  start_time: string,
  end_time: string
): Promise<{ error?: string }> {
  if (end_time <= start_time) return { error: 'End time must be after start time' }

  const supabase = await createClient()
  const { error } = await supabase.from('availability_windows').update({ start_time, end_time }).eq('id', id)
  if (error) return { error: error.message }
  refresh()
  return {}
}

export async function deleteWindowsByWeekday(period_id: string, weekday: number): Promise<void> {
  const supabase = await createClient()
  await supabase.from('availability_windows').delete().eq('period_id', period_id).eq('weekday', weekday)
  refresh()
}

// ── Period exceptions ──────────────────────────────────────────────────────

export async function addException(
  period_id: string,
  exception_date: string,
  reason?: string,
  block_start?: string,
  block_end?: string
): Promise<{ error?: string }> {
  if (!period_id || !exception_date) return { error: 'Missing required fields' }
  if (block_start && block_end && block_end <= block_start) return { error: 'End time must be after start time' }
  // Ensure both or neither
  if (!!block_start !== !!block_end) return { error: 'Provide both start and end times or neither' }

  const supabase = await createClient()
  const { error } = await supabase.from('period_exceptions').insert({
    period_id,
    exception_date,
    reason: reason || null,
    block_start: block_start || null,
    block_end: block_end || null,
  })
  if (error) return { error: error.message }
  refresh()
  return {}
}

export async function deleteException(id: string): Promise<void> {
  const supabase = await createClient()
  await supabase.from('period_exceptions').delete().eq('id', id)
  refresh()
}

// ── Blackouts ──────────────────────────────────────────────────────────────

async function triggerLessonGenerator() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  try {
    await fetch(`${appUrl}/api/cron/generate-lessons`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
    })
  } catch {}
}

export async function createBlackout(
  start_date: string,
  end_date: string,
  reason?: string
): Promise<{ error?: string }> {
  if (!start_date || !end_date) return { error: 'Dates are required' }
  if (end_date < start_date) return { error: 'End date must be after start date' }

  const supabase = await createClient()
  const { error } = await supabase.from('blackouts').insert({ start_date, end_date, reason: reason || null })
  if (error) return { error: error.message }
  refresh()
  revalidatePath('/blackouts')
  triggerLessonGenerator()
  return {}
}

export async function deleteBlackout(id: string): Promise<void> {
  const supabase = await createClient()
  await supabase.from('blackouts').delete().eq('id', id)
  refresh()
  revalidatePath('/blackouts')
  triggerLessonGenerator()
}
