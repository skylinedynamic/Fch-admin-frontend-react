import { describe, expect, it } from 'vitest'
import { formatRelativeToNow, isReminderPastDue } from '../../src/utils/reminders'

const NOW = Date.parse('2026-10-31T12:00:00Z')

describe('formatRelativeToNow', () => {
  it('words a time ahead or behind in the largest whole unit', () => {
    expect(formatRelativeToNow('2026-10-31T12:20:00Z', NOW)).toBe('in 20 minutes')
    expect(formatRelativeToNow('2026-10-31T15:00:00Z', NOW)).toBe('in 3 hours')
    expect(formatRelativeToNow('2026-11-02T12:00:00Z', NOW)).toBe('in 2 days')
    expect(formatRelativeToNow('2026-10-30T12:00:00Z', NOW)).toBe('yesterday')
    expect(formatRelativeToNow('2026-10-17T12:00:00Z', NOW)).toBe('2 weeks ago')
  })

  it('says "now" within a minute, and nothing for a missing or broken value', () => {
    expect(formatRelativeToNow('2026-10-31T12:00:20Z', NOW)).toBe('now')
    expect(formatRelativeToNow(null, NOW)).toBe('')
    expect(formatRelativeToNow('not a date', NOW)).toBe('')
  })
})

describe('isReminderPastDue', () => {
  it("goes by the activity's own time, falling back to the API's flag", () => {
    expect(isReminderPastDue({ set_date_time: '2026-10-31T11:00:00Z' }, NOW)).toBe(true)
    expect(isReminderPastDue({ set_date_time: '2026-10-31T13:00:00Z' }, NOW)).toBe(false)
    expect(isReminderPastDue({ is_past_due: true }, NOW)).toBe(true)
  })
})
