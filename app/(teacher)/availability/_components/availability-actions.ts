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

export async function createPeriod(
  name: string,
  start_date: string,
  end_date: string
): Promise<{ error?: string }> {
  const parsed = PeriodSchema.safeParse({ name, start_date, end_date })
  if (!parsed.success) return { error: parsed.error.issues[0].message }
  if (parsed.data.end_date < parsed.data.start_date) return { error: 'End date must be after start date' }

  const supabase = await createClient()
  const { error } = await supabase.from('availability_periods').insert(parsed.data)
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

export async function deleteWindow(id: string): Promise<void> {
  const supabase = await createClient()
  await supabase.from('availability_windows').delete().eq('id', id)
  refresh()
}

// ── Period exceptions ──────────────────────────────────────────────────────

const ExceptionSchema = z.object({
  period_id: z.string().uuid(),
  exception_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reason: z.string().optional(),
})

export async function addException(
  period_id: string,
  exception_date: string,
  reason?: string
): Promise<{ error?: string }> {
  const parsed = ExceptionSchema.safeParse({ period_id, exception_date, reason: reason || undefined })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createClient()
  const { error } = await supabase.from('period_exceptions').insert(parsed.data)
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

const BlackoutSchema = z.object({
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reason: z.string().optional(),
})

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
  const parsed = BlackoutSchema.safeParse({ start_date, end_date, reason: reason || undefined })
  if (!parsed.success) return { error: parsed.error.issues[0].message }
  if (parsed.data.end_date < parsed.data.start_date) return { error: 'End date must be after start date' }

  const supabase = await createClient()
  const { error } = await supabase.from('blackouts').insert(parsed.data)
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
