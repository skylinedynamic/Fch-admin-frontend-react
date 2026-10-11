import { describe, expect, it } from 'vitest'
import { isSubscriptionRestricted } from '../../../src/lib/auth/subscriptionUtils'
import { STATUS_ACTIVE, STATUS_CANCELLED, STATUS_COMPLETED } from '../../../src/config/subscriptionConfig'
import type { UserSubscription } from '../../../src/store/auth/authStore'

const futureDate = () => {
  const d = new Date()
  d.setDate(d.getDate() + 30)
  return d.toISOString().slice(0, 10)
}

const pastDate = () => {
  const d = new Date()
  d.setDate(d.getDate() - 30)
  return d.toISOString().slice(0, 10)
}

describe('isSubscriptionRestricted', () => {
  it('is false when there is no subscription', () => {
    expect(isSubscriptionRestricted(null)).toBe(false)
    expect(isSubscriptionRestricted(undefined)).toBe(false)
  })

  it('is false for hosts, even with an unusual status', () => {
    expect(isSubscriptionRestricted({ is_host: true, subscription_status: 'weird-status' } as UserSubscription)).toBe(false)
  })

  it('is false while on an active (non-expired) free trial', () => {
    expect(isSubscriptionRestricted({ is_free_trail: true, free_trail_end_date: futureDate() } as UserSubscription)).toBe(false)
  })

  it('is false on a free trial with no end date set (treated as ongoing)', () => {
    expect(isSubscriptionRestricted({ is_free_trail: true } as UserSubscription)).toBe(false)
  })

  it('is true once the free trial end date has passed', () => {
    expect(isSubscriptionRestricted({ is_free_trail: true, free_trail_end_date: pastDate() } as UserSubscription)).toBe(true)
  })

  it.each([STATUS_ACTIVE, STATUS_CANCELLED, STATUS_COMPLETED])(
    'is false for status "%s" with no end date',
    (status) => {
      expect(isSubscriptionRestricted({ subscription_status: status, subscription_end_date: null } as UserSubscription)).toBe(false)
    }
  )

  it('is true for any other status (e.g. suspended/pending)', () => {
    expect(isSubscriptionRestricted({ subscription_status: 'Suspended' } as UserSubscription)).toBe(true)
  })

  it('is false when status is active and the end date is in the future', () => {
    expect(
      isSubscriptionRestricted({ subscription_status: STATUS_ACTIVE, subscription_end_date: futureDate() } as UserSubscription)
    ).toBe(false)
  })

  it('is true when status is active but the end date has passed', () => {
    expect(
      isSubscriptionRestricted({ subscription_status: STATUS_ACTIVE, subscription_end_date: pastDate() } as UserSubscription)
    ).toBe(true)
  })
})
