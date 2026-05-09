'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const FamilySchema = z.object({
  parent_name: z.string().min(1),
  parent_email: z.string().email(),
})

export async function createFamily(formData: FormData): Promise<void> {
  const parsed = FamilySchema.safeParse({
    parent_name: formData.get('parent_name'),
    parent_email: formData.get('parent_email'),
  })
  if (!parsed.success) return

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('families')
    .insert(parsed.data)
    .select('id')
    .single()

  if (error || !data) return
  redirect(`/families/${data.id}`)
}

export async function updateFamily(id: string, formData: FormData): Promise<void> {
  const parsed = FamilySchema.safeParse({
    parent_name: formData.get('parent_name'),
    parent_email: formData.get('parent_email'),
  })
  if (!parsed.success) return

  const supabase = await createClient()
  await supabase.from('families').update(parsed.data).eq('id', id)
  revalidatePath(`/families/${id}`)
}
