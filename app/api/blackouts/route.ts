import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import type { Database } from '@/types/supabase'

export const dynamic = 'force-dynamic'

const Body = z.object({
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD'),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD'),
  reason: z.string().min(1).max(200).optional(),
})

export async function POST(request: Request) {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = Body.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  const { start_date, end_date, reason } = parsed.data

  if (end_date < start_date) {
    return NextResponse.json({ error: 'end_date must be on or after start_date' }, { status: 400 })
  }

  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data, error } = await supabase
    .from('blackouts')
    .insert({ start_date, end_date, reason: reason ?? null })
    .select('id, start_date, end_date, reason')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, blackout: data }, { status: 201 })
}
