import { Resend } from 'resend'
import { formatLessonTime } from './format-lesson-time'

export const resend = new Resend(process.env.RESEND_API_KEY)

interface CancelEmailParams {
  studentName: string
  scheduledAt: string | Date
  durationMinutes: number
  note: string
  isLate: boolean
  lessonId: string
}

export function buildCancelEmail(p: CancelEmailParams) {
  const time = formatLessonTime(p.scheduledAt, 'datetime')
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const lateWarning = p.isLate
    ? '<p style="color:#b45309;font-weight:bold;">⚠️ This cancellation is within 24 hours of the lesson.</p>'
    : ''

  const subject = p.isLate
    ? `⚠️ LATE CANCEL — ${p.studentName} (${formatLessonTime(p.scheduledAt, 'short')})`
    : `Cancellation — ${p.studentName} (${formatLessonTime(p.scheduledAt, 'short')})`

  const html = `
    <div style="font-family:sans-serif;max-width:480px;">
      ${lateWarning}
      <p><strong>Student:</strong> ${p.studentName}</p>
      <p><strong>Lesson time:</strong> ${time} (Pacific)</p>
      <p><strong>Duration:</strong> ${p.durationMinutes} min</p>
      <p><strong>Parent's note:</strong> "${p.note}"</p>
      <p><a href="${appUrl}/lessons?id=${p.lessonId}">View lesson in Cadence →</a></p>
    </div>
  `

  return { subject, html }
}
