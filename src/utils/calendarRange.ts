import { localDateString } from './appointmentTime'

interface CalendarLike {
  view?: { activeStart: Date; activeEnd: Date }
}

/**
 * The days a FullCalendar view shows (Month / Week / Day), as Y-m-d in the
 * browser's zone - what Calendly's Sync now brings in. FullCalendar's end is
 * exclusive. Without a calendar: the current month.
 */
export function calendarRange(calendar: CalendarLike | null | undefined, today: Date = new Date()): { from: string; to: string } {
  if (calendar?.view) {
    const lastDay = new Date(calendar.view.activeEnd.getTime() - 24 * 60 * 60 * 1000)
    return { from: localDateString(calendar.view.activeStart), to: localDateString(lastDay) }
  }

  return {
    from: localDateString(new Date(today.getFullYear(), today.getMonth(), 1)),
    to: localDateString(new Date(today.getFullYear(), today.getMonth() + 1, 0)),
  }
}
