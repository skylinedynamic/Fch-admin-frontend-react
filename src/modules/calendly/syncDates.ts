import type { CalendlySyncDates } from './types'

/** The part of FullCalendar's API read here (its view's own dates, not the greyed days around them). */
type CalendarApiLike = {
  view?: { type?: string; currentStart?: Date; currentEnd?: Date } | null
} | null | undefined

const VIEW_NAMES: Record<string, string> = {
  dayGridMonth: 'Month view',
  listMonth: 'Month view',
  timeGridWeek: 'Week view',
  dayGridWeek: 'Week view',
  listWeek: 'Week view',
  timeGridDay: 'Day view',
  dayGridDay: 'Day view',
  listDay: 'Day view',
}

const pad = (n: number) => String(n).padStart(2, '0')
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

/**
 * The dates the calendar shows - its Month, Week or Day - for Sync now:
 * from its first to its last day (FullCalendar's end is the day after). Null
 * when there is no calendar to read (Sync now then covers the current month).
 */
export function calendarSyncDates(api: CalendarApiLike): CalendlySyncDates | null {
  const start = api?.view?.currentStart
  const endExclusive = api?.view?.currentEnd
  if (!(start instanceof Date) || !(endExclusive instanceof Date)) return null

  const end = new Date(endExclusive.getTime() - 1)
  const sameDay = ymd(start) === ymd(end)
  const label = sameDay
    ? start.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
    : `${start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`

  return { from: ymd(start), to: ymd(end), label, view: VIEW_NAMES[api?.view?.type ?? ''] }
}
