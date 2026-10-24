/**
 * Appointment times are booked and shown in the browser's own time zone; the
 * API stores them in UTC and sends them back in the zone named by the
 * X-Timezone header (BUG-080).
 */

/** The browser's time zone, e.g. "Asia/Dhaka". */
export const browserTimeZone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

/** A zone with its offset at that moment, e.g. "Asia/Dhaka (GMT+06:00)". */
export const timeZoneLabel = (zone: string, at: Date = new Date()): string => {
  let offset = 'GMT'
  try {
    offset = new Intl.DateTimeFormat('en-US', { timeZone: zone, timeZoneName: 'longOffset' })
      .formatToParts(at)
      .find((part) => part.type === 'timeZoneName')?.value ?? 'GMT'
  } catch {
    // An unknown zone keeps the plain GMT label.
  }
  return `${zone} (${offset === 'GMT' ? 'GMT+00:00' : offset})`
}

const pad = (n: number) => String(n).padStart(2, '0')

/** The browser's calendar day as YYYY-MM-DD (toISOString() gives the UTC day). */
export const localDateString = (date: Date = new Date()): string =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

/** The start times that can still be booked on `date`: for today, only those after now (BUG-078). */
export const startSlotsFrom = <T extends { value: string }>(slots: T[], date: string, now: Date = new Date()): T[] => {
  if (date !== localDateString(now)) return slots
  const current = `${pad(now.getHours())}:${pad(now.getMinutes())}`
  return slots.filter((slot) => slot.value > current)
}

/**
 * Where a new booking starts: `preferred` when it can still be booked on `date`,
 * else the next free time that day, else `preferred` tomorrow (BUG-078).
 */
export const defaultStart = <T extends { value: string }>(
  slots: T[],
  date: string,
  now: Date = new Date(),
  preferred = '09:00'
): { date: string; time: string } => {
  const open = startSlotsFrom(slots, date, now)
  if (open.some((slot) => slot.value === preferred)) return { date, time: preferred }
  if (open.length) return { date, time: open[0].value }

  const [y, m, d] = date.split('-').map(Number)
  return { date: localDateString(new Date(y, m - 1, d + 1)), time: preferred }
}

/** The time `minutes` after `start` (HH:mm), kept within the day. */
export const timeAfter = (start: string, minutes = 30): string => {
  const [h, m] = start.split(':').map(Number)
  const total = Math.min(h * 60 + m + minutes, 23 * 60 + 59)
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`
}
