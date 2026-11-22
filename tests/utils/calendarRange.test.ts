import { describe, expect, it } from 'vitest'
import { calendarRange } from '../../src/utils/calendarRange'

describe('calendarRange (the dates Sync now covers)', () => {
  it('is the dates the calendar shows - FullCalendar\'s end is exclusive', () => {
    expect(calendarRange({ view: { activeStart: new Date(2026, 10, 1), activeEnd: new Date(2026, 11, 1) } }))
      .toEqual({ from: '2026-11-01', to: '2026-11-30' })
  })

  it('is this month when there is no calendar yet', () => {
    expect(calendarRange(null, new Date(2026, 1, 14))).toEqual({ from: '2026-02-01', to: '2026-02-28' })
  })
})
