'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { sendEmail, buildApprovalEmail } from '@/lib/email'

export async function approveLesson(lessonId: string): Promise<{ error?: string }> {
  const supabase = await createClient()

  const { data: lesson } = await supabase
    .from('lessons')
    .select('id, scheduled_at, duration_minutes, status, students(name, families(parent_email))')
    .eq('id', lessonId)
    .single()

  if (!lesson || lesson.status !== 'pending') return { error: 'Lesson not found or not pending' }

  const { error } = await supabase
    .from('lessons')
    .update({ status: 'scheduled' })
    .eq('id', lessonId)

  if (error) return { error: error.message }

  const student = lesson.students as { name: string; families: { parent_email: string } | null } | null
  const parentEmail = student?.families?.parent_email
  if (parentEmail) {
    try {
      const email = buildApprovalEmail({
        studentName: student!.name,
        scheduledAt: lesson.scheduled_at,
        durationMinutes: lesson.duration_minutes,
        approved: true,
      })
      await sendEmail(parentEmail, email.subject, email.html)
    } catch { /* don't fail if email fails */ }
  }

  return {}
}

export async function declineLesson(lessonId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const service = createServiceClient()

  const { data: lesson } = await supabase
    .from('lessons')
    .select('id, scheduled_at, duration_minutes, status, students(name, families(parent_email))')
    .eq('id', lessonId)
    .single()

  if (!lesson || lesson.status !== 'pending') return { error: 'Lesson not found or not pending' }

  const { error } = await service
    .from('lessons')
    .update({ status: 'cancelled' })
    .eq('id', lessonId)

  if (error) return { error: error.message }

  const student = lesson.students as { name: string; families: { parent_email: string } | null } | null
  const parentEmail = student?.families?.parent_email
  if (parentEmail) {
    try {
      const email = buildApprovalEmail({
        studentName: student!.name,
        scheduledAt: lesson.scheduled_at,
        durationMinutes: lesson.duration_minutes,
        approved: false,
      })
      await sendEmail(parentEmail, email.subject, email.html)
    } catch { /* don't fail if email fails */ }
  }

  return {}
}
