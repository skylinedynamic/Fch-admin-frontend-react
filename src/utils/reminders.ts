type ReminderTimes = {
  set_date_time?: string | null
  send_at?: string | null
  reminder_date_time?: string | null
  is_past_due?: boolean
}

/**
 * Whether the activity behind a reminder (the call/meeting itself) has already
 * passed - shown as "missed". The API sets is_past_due when it renders the
 * reminder, but a pop-up that stays open would keep that stale value without
 * polling, so it's worked out here from the activity's own time (ISO-8601 with
 * offset, as the API returns it), falling back to the API's value.
 */
export function isReminderPastDue(reminder: ReminderTimes, nowMs: number = Date.now()): boolean {
  const activityAt = reminder.set_date_time ?? reminder.send_at ?? reminder.reminder_date_time
  const at = activityAt ? Date.parse(activityAt) : NaN

  return Number.isNaN(at) ? !!reminder.is_past_due : at <= nowMs
}

const RELATIVE_UNITS: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ['week', 7 * 86_400_000],
  ['day', 86_400_000],
  ['hour', 3_600_000],
  ['minute', 60_000],
]

/**
 * "in 2 days", "yesterday", "3 hours ago" - an ISO date-time against now, in
 * the largest whole unit (weeks down to minutes). '' when there is none.
 */
export function formatRelativeToNow(iso: string | null | undefined, nowMs: number = Date.now()): string {
  const at = iso ? Date.parse(iso) : NaN
  if (Number.isNaN(at)) return ''

  const diff = at - nowMs
  const format = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
  for (const [unit, ms] of RELATIVE_UNITS) {
    if (Math.abs(diff) >= ms) return format.format(Math.round(diff / ms), unit)
  }

  return 'now'
}
