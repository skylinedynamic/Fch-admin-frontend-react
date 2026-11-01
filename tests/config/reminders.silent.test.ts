import { describe, expect, it } from 'vitest'
import {
  getEffectiveReminderStatusBadgeClasses,
  getEffectiveReminderStatusLabel,
  isReminderMissed,
  isSilentReminder,
} from '../../src/config/reminders'

// The creator's copy of a task only its assignee is reminded of: listed in
// Task & Reminders, never popped up (is_reminder false).
describe('silent reminders', () => {
  const silent = { status: 'pending', is_reminder: false, is_past_due: true }

  it('reads "No Popup" - never "Missed" - while pending', () => {
    expect(isSilentReminder(silent)).toBe(true)
    expect(isReminderMissed(silent)).toBe(false)
    expect(getEffectiveReminderStatusLabel(silent)).toBe('No Popup')
    expect(getEffectiveReminderStatusBadgeClasses(silent)).toBe('bg-secondary-subtle text-secondary')
  })

  it('keeps its own status once dismissed, and leaves real reminders as they were', () => {
    expect(getEffectiveReminderStatusLabel({ ...silent, status: 'cancelled' })).not.toBe('No Popup')
    expect(isSilentReminder({ status: 'pending', is_reminder: true })).toBe(false)
    expect(getEffectiveReminderStatusLabel({ status: 'pending', is_reminder: true, is_past_due: true })).toBe('Missed')
  })
})
