import { describe, expect, it } from 'vitest'
import { getBorrowerPlanBadgeConfig } from '../../src/utils/badgeHelper'

/**
 * BUG-058: a converted loan application names the client's real plan - a free
 * client "Free Plan" (or "Free Plan Expired"), a paid client its enrollment
 * type (e.g. "One Time Payment"), never a hard-coded "Free Plan".
 */
describe('getBorrowerPlanBadgeConfig', () => {
  it('a free client is on the Free Plan', () => {
    expect(getBorrowerPlanBadgeConfig({ is_free_trail: true }).label).toBe('Free Plan')
  })

  it('a free client past its end date is on an expired Free Plan', () => {
    expect(getBorrowerPlanBadgeConfig({ is_free_trail: true, free_trail_end_date: '2020-01-01' }).label).toBe('Free Plan Expired')
  })

  it('a paid client is on its enrollment type', () => {
    const badge = getBorrowerPlanBadgeConfig({ is_free_trail: false, enrollment_type: 'One Time Payment' })
    expect(badge.label).toBe('One Time Payment')
    expect(badge.badgeClass).toBe('bg-primary-subtle text-primary')
  })

  it('a paid client without an enrollment is on the Regular Plan', () => {
    expect(getBorrowerPlanBadgeConfig({ is_free_trail: false, enrollment_type: null }).label).toBe('Regular Plan')
  })
})
