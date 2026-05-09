'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

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

export async function createBlackout(formData: FormData): Promise<void> {
  const parsed = BlackoutSchema.safeParse({
    start_date: formData.get('start_date'),
    end_date: formData.get('end_date'),
    reason: formData.get('reason') || undefined,
  })
  if (!parsed.success) return

  const supabase = await createClient()
  await supabase.from('blackouts').insert(parsed.data)
  revalidatePath('/blackouts')
  triggerLessonGenerator()
}

export async function deleteBlackout(id: string): Promise<void> {
  const supabase = await createClient()
  await supabase.from('blackouts').delete().eq('id', id)
  revalidatePath('/blackouts')
  triggerLessonGenerator()
}
