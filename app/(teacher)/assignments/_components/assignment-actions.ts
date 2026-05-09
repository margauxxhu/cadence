'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const AssignmentSchema = z.object({
  student_id: z.string().uuid(),
  weekday: z.coerce.number().int().min(0).max(6),
  start_time: z.string().regex(/^\d{2}:\d{2}$/),
  duration_minutes: z.coerce.number().int().positive().default(45),
  active_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  active_until: z.string().nullable().optional(),
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

// Used in a client component via useTransition — returns error for inline feedback
export async function createAssignment(
  formData: FormData
): Promise<{ error: string } | { success: true }> {
  const raw = {
    student_id: formData.get('student_id'),
    weekday: formData.get('weekday'),
    start_time: formData.get('start_time'),
    duration_minutes: formData.get('duration_minutes') || 45,
    active_from: formData.get('active_from'),
    active_until: formData.get('active_until') || null,
  }
  const parsed = AssignmentSchema.safeParse(raw)
  if (!parsed.success) return { error: 'Invalid input' }

  const supabase = await createClient()
  const { error } = await supabase.from('recurring_assignments').insert({
    ...parsed.data,
    active_until: parsed.data.active_until || null,
  })
  if (error) return { error: error.message }

  revalidatePath('/assignments')
  triggerLessonGenerator()
  return { success: true }
}

// Used as a direct form action — must return void
export async function deleteAssignment(id: string): Promise<void> {
  const supabase = await createClient()
  await supabase.from('recurring_assignments').delete().eq('id', id)
  revalidatePath('/assignments')
  triggerLessonGenerator()
}
