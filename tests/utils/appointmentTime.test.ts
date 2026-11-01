import { describe, expect, it } from 'vitest'
import { browserTimeZone, defaultStart, localDateString, startSlotsFrom, timeAfter, timeZoneLabel } from '../../src/utils/appointmentTime'

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

  it('ends a booking half an hour after it starts, within the day', () => {
    expect(timeAfter('09:00')).toBe('09:30')
    expect(timeAfter('09:30')).toBe('10:00')
    expect(timeAfter('23:30')).toBe('23:59')
  })
})
