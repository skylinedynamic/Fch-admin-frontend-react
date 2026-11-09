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

const MINUTES_PER_DAY = 24 * 60

const toMinutes = (time: string): number => {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

/** The time `minutes` after `start` (HH:mm); past midnight it is the next day's (R2 BUG-024). */
export const timeAfter = (start: string, minutes = 30): string => {
  const total = (toMinutes(start) + minutes) % MINUTES_PER_DAY
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`
}

/**
 * The end times for an appointment starting at `start`: every slot after it,
 * running on past midnight into the next day - those are labelled "(next day)"
 * (R2 BUG-024).
 */
export const endSlotsAfter = <T extends { label: string; value: string }>(slots: T[], start: string): T[] => [
  ...slots.filter((slot) => slot.value > start),
  ...slots.filter((slot) => slot.value < start).map((slot) => ({ ...slot, label: `${slot.label} (next day)` })),
]

/** Minutes from `start` to `end`; an end at or before the start is on the next day (R2 BUG-024). */
export const minutesBetween = (start: string, end: string): number => {
  const diff = toMinutes(end) - toMinutes(start)
  return diff > 0 ? diff : diff + MINUTES_PER_DAY
}

/** The end as a time on the start's day: an end past midnight closes it at "24:00". */
export const endWithinDay = (start: string, end: string): string => (end > start ? end : '24:00')
