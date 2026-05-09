'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const WindowSchema = z.object({
  weekday: z.coerce.number().int().min(0).max(6),
  start_time: z.string().regex(/^\d{2}:\d{2}$/),
  end_time: z.string().regex(/^\d{2}:\d{2}$/),
})

export async function createAvailabilityWindow(formData: FormData) {
  const parsed = WindowSchema.safeParse({
    weekday: formData.get('weekday'),
    start_time: formData.get('start_time'),
    end_time: formData.get('end_time'),
  })
  if (!parsed.success) return { error: 'Invalid input' }

  const supabase = await createClient()
  const { error } = await supabase.from('availability_template').insert(parsed.data)
  if (error) return { error: error.message }

  revalidatePath('/availability')
  return { success: true }
}

export async function deleteAvailabilityWindow(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('availability_template').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/availability')
  return { success: true }
}
