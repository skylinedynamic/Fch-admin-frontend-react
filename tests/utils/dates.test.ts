import { describe, expect, it } from 'vitest'
import { formatRelativeTime } from '../../src/utils/dates'

describe('formatRelativeTime', () => {
  const now = new Date('2026-10-01T12:00:00Z')

  it('returns an empty string for missing or invalid values', () => {
    expect(formatRelativeTime(null, now)).toBe('')
    expect(formatRelativeTime('not a date', now)).toBe('')
  })

  it('says "Just now" for the last minute (and for small clock skew)', () => {
    expect(formatRelativeTime('2026-10-01T11:59:30Z', now)).toBe('Just now')
    expect(formatRelativeTime('2026-10-01T12:00:20Z', now)).toBe('Just now')
  })

  it('uses minutes, hours and days within the last week', () => {
    expect(formatRelativeTime('2026-10-01T11:55:00Z', now)).toBe('5 minutes ago')
    expect(formatRelativeTime('2026-10-01T09:00:00Z', now)).toBe('3 hours ago')
    expect(formatRelativeTime('2026-09-30T12:00:00Z', now)).toBe('yesterday')
    expect(formatRelativeTime('2026-09-27T12:00:00Z', now)).toBe('4 days ago')
  })

  it('shows the date once it is a week or more old', () => {
    expect(formatRelativeTime('2026-09-01T12:00:00Z', now)).toBe('Sep 1, 2026')
  })
})
