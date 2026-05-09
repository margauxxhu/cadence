import nodemailer from 'nodemailer'
import { formatLessonTime } from './format-lesson-time'

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
})

export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  await transporter.sendMail({
    from: `Cadence <${process.env.GMAIL_USER}>`,
    to,
    subject,
    html,
  })
}

// ── Email builders ────────────────────────────────────────────────────────────

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
    </div>
  `
  return { subject, html }
}

interface RescheduleEmailParams {
  studentName: string
  originalAt: string | Date
  newAt: string | Date
  durationMinutes: number
  note: string
  newLessonId: string
}

export function buildRescheduleEmail(p: RescheduleEmailParams) {
  const subject = `Reschedule — ${p.studentName} (${formatLessonTime(p.originalAt, 'short')} → ${formatLessonTime(p.newAt, 'short')})`

  const html = `
    <div style="font-family:sans-serif;max-width:480px;">
      <p><strong>Student:</strong> ${p.studentName}</p>
      <p><strong>Original time:</strong> ${formatLessonTime(p.originalAt, 'datetime')} (Pacific)</p>
      <p><strong>New time:</strong> ${formatLessonTime(p.newAt, 'datetime')} (Pacific)</p>
      <p><strong>Duration:</strong> ${p.durationMinutes} min</p>
      <p><strong>Parent's note:</strong> "${p.note}"</p>
    </div>
  `
  return { subject, html }
}

interface AddLessonEmailParams {
  studentName: string
  scheduledAt: string | Date
  durationMinutes: number
  note: string
  isPending: boolean
}

export function buildAddLessonEmail(p: AddLessonEmailParams) {
  const subject = p.isPending
    ? `Trial request — ${p.studentName} (${formatLessonTime(p.scheduledAt, 'short')})`
    : `New lesson — ${p.studentName} (${formatLessonTime(p.scheduledAt, 'short')})`

  const statusLine = p.isPending
    ? '<p style="color:#b45309;font-weight:bold;">⏳ Trial request — please review and approve in Cadence.</p>'
    : '<p style="color:#15803d;font-weight:bold;">✓ Lesson confirmed automatically.</p>'

  const html = `
    <div style="font-family:sans-serif;max-width:480px;">
      ${statusLine}
      <p><strong>Student:</strong> ${p.studentName}</p>
      <p><strong>Time:</strong> ${formatLessonTime(p.scheduledAt, 'datetime')} (Pacific)</p>
      <p><strong>Duration:</strong> ${p.durationMinutes} min</p>
      ${p.note ? `<p><strong>Note:</strong> "${p.note}"</p>` : ''}
    </div>
  `
  return { subject, html }
}

interface ApprovalEmailParams {
  studentName: string
  scheduledAt: string | Date
  durationMinutes: number
  approved: boolean
}

export function buildApprovalEmail(p: ApprovalEmailParams) {
  const subject = p.approved
    ? `Lesson confirmed — ${p.studentName} (${formatLessonTime(p.scheduledAt, 'short')})`
    : `Lesson declined — ${p.studentName} (${formatLessonTime(p.scheduledAt, 'short')})`

  const html = `
    <div style="font-family:sans-serif;max-width:480px;">
      <p>${p.approved
        ? `✓ Your lesson request for <strong>${p.studentName}</strong> has been <strong>confirmed</strong>.`
        : `Your lesson request for <strong>${p.studentName}</strong> was not approved. Please contact your teacher to find another time.`
      }</p>
      <p><strong>Time:</strong> ${formatLessonTime(p.scheduledAt, 'datetime')} (Pacific)</p>
      <p><strong>Duration:</strong> ${p.durationMinutes} min</p>
    </div>
  `
  return { subject, html }
}
