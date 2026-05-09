'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const StudentSchema = z.object({
  name: z.string().min(1),
  family_id: z.string().uuid(),
})

export async function createStudent(formData: FormData): Promise<void> {
  const parsed = StudentSchema.safeParse({
    name: formData.get('name'),
    family_id: formData.get('family_id'),
  })
  if (!parsed.success) return

  const supabase = await createClient()
  await supabase.from('students').insert(parsed.data)
  revalidatePath(`/families/${parsed.data.family_id}`)
}

export async function toggleStudentActive(
  studentId: string,
  active: boolean,
  familyId: string
): Promise<void> {
  const supabase = await createClient()
  await supabase.from('students').update({ active }).eq('id', studentId)
  revalidatePath(`/families/${familyId}`)
}
