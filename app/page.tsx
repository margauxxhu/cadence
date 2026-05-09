import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function RootPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Check if this user is the teacher
  const { data: settings } = await supabase
    .from('teacher_settings')
    .select('teacher_uid')
    .single()

  if (settings?.teacher_uid === user.id) {
    redirect('/dashboard')
  }

  redirect('/my-lessons')
}
