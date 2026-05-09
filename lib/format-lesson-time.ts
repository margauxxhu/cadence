import { toZonedTime, format as tzFormat } from 'date-fns-tz'

const TZ = 'America/Los_Angeles'

const FORMATS = {
  date: 'EEE, MMM d, yyyy',
  time: 'h:mm a',
  datetime: 'EEE, MMM d, yyyy \'at\' h:mm a',
  short: 'EEE MMM d, h:mm a',
} as const

export function formatLessonTime(
  scheduledAt: string | Date,
  fmt: keyof typeof FORMATS = 'datetime'
): string {
  const zoned = toZonedTime(new Date(scheduledAt), TZ)
  return tzFormat(zoned, FORMATS[fmt], { timeZone: TZ })
}
