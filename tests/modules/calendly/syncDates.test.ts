import { describe, expect, it } from 'vitest'
import { calendarSyncDates } from '../../../src/modules/calendly/syncDates'

/** FullCalendar's view: its own first day, and the day after its last (exclusive end). */
const api = (type: string, start: Date, endExclusive: Date) => ({ view: { type, currentStart: start, currentEnd: endExclusive } })

describe('calendarSyncDates - the dates Sync now covers', () => {
  it('is null with no calendar, no view or no dates to read (Sync now then covers this month)', () => {
    expect(calendarSyncDates(undefined)).toBeNull()
    expect(calendarSyncDates(null)).toBeNull()
    expect(calendarSyncDates({})).toBeNull()
    expect(calendarSyncDates({ view: null })).toBeNull()
    expect(calendarSyncDates({ view: { type: 'dayGridMonth' } })).toBeNull()
    expect(calendarSyncDates({ view: { type: 'dayGridMonth', currentStart: new Date(2026, 10, 1) } })).toBeNull()
  })

  it('Month view: from its first to its last day - not the exclusive end FullCalendar gives', () => {
    const dates = calendarSyncDates(api('dayGridMonth', new Date(2026, 10, 1), new Date(2026, 11, 1)))

    expect(dates).toMatchObject({ from: '2026-11-01', to: '2026-11-30', view: 'Month view' })
    expect(dates?.label).toContain('–')
    expect(dates?.label).toContain('2026')
  })

  it('Week view: a range across a month end', () => {
    expect(calendarSyncDates(api('timeGridWeek', new Date(2026, 10, 29), new Date(2026, 11, 6))))
      .toMatchObject({ from: '2026-11-29', to: '2026-12-05', view: 'Week view' })
  })

  it('Day view: one day, labelled as that day (no range)', () => {
    const start = new Date(2026, 10, 19)
    const dates = calendarSyncDates(api('timeGridDay', start, new Date(2026, 10, 20)))

    expect(dates).toMatchObject({ from: '2026-11-19', to: '2026-11-19', view: 'Day view' })
    expect(dates?.label).toBe(start.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }))
    expect(dates?.label).not.toContain('–')
  })

  it('pads single-digit months and days', () => {
    expect(calendarSyncDates(api('dayGridDay', new Date(2026, 0, 5), new Date(2026, 0, 6))))
      .toMatchObject({ from: '2026-01-05', to: '2026-01-05' })
  })

  it.each([
    ['dayGridMonth', 'Month view'], ['listMonth', 'Month view'],
    ['timeGridWeek', 'Week view'], ['dayGridWeek', 'Week view'], ['listWeek', 'Week view'],
    ['timeGridDay', 'Day view'], ['dayGridDay', 'Day view'], ['listDay', 'Day view'],
  ])('names the %s view "%s"', (type, name) => {
    expect(calendarSyncDates(api(type, new Date(2026, 10, 1), new Date(2026, 10, 2)))?.view).toBe(name)
  })

  it('leaves the view name out for a view it does not know, or none', () => {
    expect(calendarSyncDates(api('multiMonthYear', new Date(2026, 0, 1), new Date(2027, 0, 1)))?.view).toBeUndefined()
    expect(calendarSyncDates({ view: { currentStart: new Date(2026, 0, 1), currentEnd: new Date(2026, 0, 2) } })?.view).toBeUndefined()
  })
})
