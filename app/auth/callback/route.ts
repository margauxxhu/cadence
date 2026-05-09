import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type')
  const next = searchParams.get('next') ?? '/my-lessons'

  console.log('[auth/callback]', { code: !!code, tokenHash: !!tokenHash, type, next })

  const supabase = await createClient()

  // PKCE flow (default for @supabase/ssr)
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    console.log('[auth/callback] exchangeCodeForSession error:', error)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Token hash flow (used by some Supabase email templates)
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: type as 'email' | 'magiclink' })
    console.log('[auth/callback] verifyOtp error:', error)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/magic-link?error=auth`)
}
