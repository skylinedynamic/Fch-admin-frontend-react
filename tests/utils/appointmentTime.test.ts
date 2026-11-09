import { describe, expect, it } from 'vitest'
import { browserTimeZone, defaultStart, endSlotsAfter, endWithinDay, localDateString, minutesBetween, startSlotsFrom, timeAfter, timeZoneLabel } from '../../src/utils/appointmentTime'

/**
 * BUG-078 / BUG-080: an appointment is booked in the browser's own time zone
 * (stored in UTC by the API), on the browser's own calendar day, and never at
 * a time of today that has already passed.
 */
const SLOTS = ['08:30', '09:00', '13:00', '13:30', '14:00'].map((value) => ({ label: value, value }))

describe('appointment time helpers', () => {
  it("names the browser's zone", () => {
    expect(browserTimeZone()).toBe(Intl.DateTimeFormat().resolvedOptions().timeZone)
  })

  it('labels a zone with its offset', () => {
    const at = new Date('2026-10-26T13:00:00Z')
    expect(timeZoneLabel('Asia/Dhaka', at)).toBe('Asia/Dhaka (GMT+06:00)')
    expect(timeZoneLabel('Asia/Kolkata', at)).toBe('Asia/Kolkata (GMT+05:30)')
    expect(timeZoneLabel('UTC', at)).toBe('UTC (GMT+00:00)')
  })

  it("gives the browser's calendar day, not the UTC one", () => {
    // 23:30 local on the 26th - toISOString() would already say the 27th east of UTC.
    expect(localDateString(new Date(2026, 9, 26, 23, 30))).toBe('2026-10-26')
  })

  it('offers only the times still ahead today', () => {
    const now = new Date(2026, 9, 26, 13, 10)
    expect(startSlotsFrom(SLOTS, '2026-10-26', now).map((s) => s.value)).toEqual(['13:30', '14:00'])
  })

  it('offers every time on a later day', () => {
    const now = new Date(2026, 9, 26, 13, 10)
    expect(startSlotsFrom(SLOTS, '2026-10-27', now)).toEqual(SLOTS)
  })

  it('starts a new booking at 09:00 when that is still ahead', () => {
    expect(defaultStart(SLOTS, '2026-10-26', new Date(2026, 9, 26, 7, 0))).toEqual({ date: '2026-10-26', time: '09:00' })
    expect(defaultStart(SLOTS, '2026-10-28', new Date(2026, 9, 26, 15, 0))).toEqual({ date: '2026-10-28', time: '09:00' })
  })

  it('otherwise at the next free time today', () => {
    expect(defaultStart(SLOTS, '2026-10-26', new Date(2026, 9, 26, 13, 10))).toEqual({ date: '2026-10-26', time: '13:30' })
  })

  it('and tomorrow once today has no time left', () => {
    expect(defaultStart(SLOTS, '2026-10-26', new Date(2026, 9, 26, 20, 0))).toEqual({ date: '2026-10-27', time: '09:00' })
  })

  it('ends a booking half an hour after it starts', () => {
    expect(timeAfter('09:00')).toBe('09:30')
    expect(timeAfter('09:30')).toBe('10:00')
  })
})

/**
 * Round 2 BUG-024: an appointment starting at 11:30 PM had no end time to pick
 * (the list only ran to midnight), so it saved as 0 minutes and the API
 * refused it. An end at or before the start is on the next day.
 */
describe('appointments that end after midnight (R2 BUG-024)', () => {
  it('a booking at 11:30 PM ends at midnight, not at 11:59 PM', () => {
    expect(timeAfter('23:30')).toBe('00:00')
    expect(timeAfter('23:45')).toBe('00:15')
  })

  it('offers every time after the start as its end, those past midnight marked "next day"', () => {
    const slots = [
      { label: '12:00 AM', value: '00:00' },
      { label: '12:30 AM', value: '00:30' },
      { label: '11:00 PM', value: '23:00' },
      { label: '11:30 PM', value: '23:30' },
    ]
    expect(endSlotsAfter(slots, '23:30')).toEqual([
      { label: '12:00 AM (next day)', value: '00:00' },
      { label: '12:30 AM (next day)', value: '00:30' },
      { label: '11:00 PM (next day)', value: '23:00' },
    ])
    expect(endSlotsAfter(slots, '00:00')).toEqual([
      { label: '12:30 AM', value: '00:30' },
      { label: '11:00 PM', value: '23:00' },
      { label: '11:30 PM', value: '23:30' },
    ])
  })

  it('counts the minutes from start to end, across midnight', () => {
    expect(minutesBetween('09:00', '10:30')).toBe(90)
    expect(minutesBetween('23:30', '00:00')).toBe(30)
    expect(minutesBetween('23:00', '01:00')).toBe(120)
  })

  it('an end past midnight closes the start day at midnight, for comparing with that day', () => {
    expect(endWithinDay('09:00', '09:30')).toBe('09:30')
    expect(endWithinDay('23:30', '00:00')).toBe('24:00')
  })
})
