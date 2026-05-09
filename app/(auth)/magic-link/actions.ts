'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function requestMagicLink(email: string): Promise<{ error?: string }> {
  const normalised = email.toLowerCase().trim()

  // Gate: only pre-registered family emails get a link
  const service = createServiceClient()
  const { data: family } = await service
    .from('families')
    .select('id')
    .eq('parent_email', normalised)
    .single()

  if (!family) {
    return { error: "This email isn't registered. Contact your teacher to get set up." }
  }

  const supabase = await createClient()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const { error: authError } = await supabase.auth.signInWithOtp({
    email: normalised,
    options: {
      emailRedirectTo: `${appUrl}/auth/callback?next=/my-lessons`,
      shouldCreateUser: true,
    },
  })

  if (authError) return { error: authError.message }
  return {}
}
