import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateLessons } from '@/lib/lesson-generator'
import type { Database } from '@/types/supabase'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

export async function POST(request: Request) {
  const authHeader = request.headers.get('Authorization')
  const expected = `Bearer ${process.env.CRON_SECRET}`
  if (!authHeader || authHeader !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    const result = await generateLessons(supabase)
    return NextResponse.json(result)
  } catch (err) {
    console.error('Lesson generator error:', err)
    return NextResponse.json({ error: 'Generator failed' }, { status: 500 })
  }
}
