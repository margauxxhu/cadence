'use server'

import { differenceInHours } from 'date-fns'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { resend, buildCancelEmail } from '@/lib/resend'

const Schema = z.object({
  lessonId: z.string().uuid(),
  note: z.string().min(1, 'Note is required'),
})

export async function cancelLesson(
  lessonId: string,
  note: string
): Promise<{ success?: true; wasLate?: boolean; error?: string }> {
  const parsed = Schema.safeParse({ lessonId, note: note.trim() })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Load lesson with family check
  const { data: lesson } = await supabase
    .from('lessons')
    .select('id, scheduled_at, duration_minutes, status, student_id, students(name, family_id, families(parent_email))')
    .eq('id', parsed.data.lessonId)
    .single()

  if (!lesson) return { error: 'Lesson not found' }
  if (lesson.status !== 'scheduled') return { error: 'Lesson is not scheduled' }

  // Verify ownership
  const student = lesson.students as {
    name: string
    family_id: string
    families: { parent_email: string } | null
  } | null

  if (!student?.families?.parent_email || student.families.parent_email !== user.email) {
    return { error: 'Not authorized' }
  }

  const cutoffHours = Number(process.env.CANCEL_CUTOFF_HOURS ?? '24')
  const hoursUntil = differenceInHours(new Date(lesson.scheduled_at), new Date())
  const isLate = hoursUntil < cutoffHours

  const { error: updateError } = await supabase
    .from('lessons')
    .update({ status: 'cancelled', note: parsed.data.note, late_cancel: isLate })
    .eq('id', lesson.id)

  if (updateError) return { error: updateError.message }

  // Email teacher
  const emailContent = buildCancelEmail({
    studentName: student.name,
    scheduledAt: lesson.scheduled_at,
    durationMinutes: lesson.duration_minutes,
    note: parsed.data.note,
    isLate,
    lessonId: lesson.id,
  })

  try {
    const { data: emailData, error: emailErr } = await resend.emails.send({
      from: process.env.RESEND_FROM ?? 'Cadence <onboarding@resend.dev>',
      to: process.env.TEACHER_EMAIL ?? '',
      subject: emailContent.subject,
      html: emailContent.html,
    })
    if (emailErr) console.error('[cancel] Resend error:', emailErr)
    else console.log('[cancel] Email sent OK, id:', emailData?.id)
  } catch (e) {
    console.error('[cancel] Email send threw:', e)
  }

  return { success: true, wasLate: isLate }
}
