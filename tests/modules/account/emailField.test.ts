import { describe, expect, it } from 'vitest'
import { emailFieldValue } from '../../../src/modules/account'

/**
 * BUG-203: every form with a sign-in email (Profile, Clients, Partners,
 * Employees, Users) shows the pending email while a change waits. Saving other
 * fields then sends it back untouched and the change stays; typing the current
 * email back in is what withdraws it.
 */
describe('emailFieldValue', () => {
  it('shows the pending email while a change waits', () => {
    expect(emailFieldValue('old@example.test', 'new@example.test')).toBe('new@example.test')
  })

  it('shows the current email when nothing is pending', () => {
    expect(emailFieldValue('old@example.test', null)).toBe('old@example.test')
    expect(emailFieldValue('old@example.test', undefined)).toBe('old@example.test')
    expect(emailFieldValue('old@example.test', '')).toBe('old@example.test')
  })

  it('is empty when there is no email at all', () => {
    expect(emailFieldValue(null, null)).toBe('')
    expect(emailFieldValue(undefined)).toBe('')
  })
})
