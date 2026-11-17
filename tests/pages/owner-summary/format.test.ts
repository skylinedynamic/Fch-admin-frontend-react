import { describe, expect, it } from 'vitest'
import { dateRange, daysInRange, lastYearRange } from '../../../src/pages/owner-summary/components/format'

describe('dateRange', () => {
  it('shortens a range inside one month', () => {
    expect(dateRange('2026-10-01', '2026-10-31')).toBe('1 – 31 Oct 2026')
  })

  it('writes September the way the rest of the app does', () => {
    expect(dateRange('2026-08-31', '2026-09-30')).toBe('31 Aug – 30 Sep 2026')
  })

  it('shows a single day once', () => {
    expect(dateRange('2026-10-05', '2026-10-05')).toBe('5 Oct 2026')
  })
})

describe('daysInRange', () => {
  it('counts both ends', () => {
    expect(daysInRange('2026-10-01', '2026-10-31')).toBe(31)
    expect(daysInRange('2026-10-05', '2026-10-05')).toBe(1)
  })

  it('is not thrown by a clock change inside the range', () => {
    expect(daysInRange('2026-11-01', '2026-11-02')).toBe(2)
    expect(daysInRange('2026-03-08', '2026-03-09')).toBe(2)
  })
})

describe('lastYearRange', () => {
  const parts = (d: Date) => [d.getFullYear(), d.getMonth(), d.getDate()]

  it('runs from the same day a year ago to today', () => {
    const { from, to } = lastYearRange(new Date(2026, 10, 9, 15, 30))

    expect(parts(from)).toEqual([2025, 10, 9])
    expect(parts(to)).toEqual([2026, 10, 9])
  })

  it('uses 28 February when a year ago has no 29th', () => {
    const { from, to } = lastYearRange(new Date(2028, 1, 29))

    expect(parts(from)).toEqual([2027, 1, 28])
    expect(parts(to)).toEqual([2028, 1, 29])
  })
})
