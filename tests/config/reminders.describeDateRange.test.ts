import { describe, expect, it } from 'vitest'
import { describeDateRange } from '../../src/config/reminders'

/** How the Reminders list names the dates it is showing (BUG-056). */
describe('describeDateRange', () => {
  const today = new Date(2026, 9, 24)

  it('no date set: nothing to say', () => {
    expect(describeDateRange(null, today)).toBeNull()
    expect(describeDateRange([null, null], today)).toBeNull()
  })

  it("today's range - the list's default - is \"today\"", () => {
    expect(describeDateRange([new Date(2026, 9, 24), new Date(2026, 9, 24)], today)).toBe('today')
  })

  it('a half-picked range counts as that one day', () => {
    expect(describeDateRange([new Date(2026, 9, 24), null], today)).toBe('today')
    expect(describeDateRange([new Date(2026, 8, 6), null], today)).toBe('Sep 06, 2026')
  })

  it('another range shows its dates', () => {
    expect(describeDateRange([new Date(2026, 8, 1), new Date(2026, 8, 30)], today)).toBe('Sep 01, 2026 – Sep 30, 2026')
  })
})
