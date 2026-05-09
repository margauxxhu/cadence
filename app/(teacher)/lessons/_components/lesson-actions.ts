'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function markLessonCompleted(lessonId: string): Promise<void> {
  const supabase = await createClient()
  await supabase
    .from('lessons')
    .update({ status: 'completed' })
    .eq('id', lessonId)
    .eq('status', 'scheduled')
  revalidatePath('/lessons')
}
