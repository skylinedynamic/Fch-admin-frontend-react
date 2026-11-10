import { describe, expect, it } from 'vitest'
import { getAvatarConfig } from '../../src/utils/activityIconConfig'
import {
  LOG_TYPE_CREDIT_PROFILE_DELETE,
  LOG_TYPE_CREDIT_PROFILE_SAVE,
  LOG_TYPE_PARTNER_CONFIGURATION_UPDATE,
  LOG_TYPE_PARTNER_COMMISSION_UPDATE,
  LOG_TYPE_PARTNER_UPDATE,
} from '../../src/config/appConfig'

describe('getAvatarConfig', () => {
  // The host changed one of the partner's settings from Partner profile › Configuration.
  it('shows a settings icon for a partner configuration change', () => {
    expect(getAvatarConfig(LOG_TYPE_PARTNER_CONFIGURATION_UPDATE)).toEqual({
      icon: 'ri-settings-3-line',
      bgClass: 'bg-primary-subtle text-primary',
    })
  })

  // The host added, changed or removed the partner's commission (Partner profile › Commissions).
  it('shows a percent icon for a partner commission change', () => {
    expect(getAvatarConfig(LOG_TYPE_PARTNER_COMMISSION_UPDATE)).toEqual({
      icon: 'ri-percent-line',
      bgClass: 'bg-success-subtle text-success',
    })
  })

  it('keeps the team icon for other partner events', () => {
    expect(getAvatarConfig(LOG_TYPE_PARTNER_UPDATE)?.icon).toBe('ri-team-line')
  })

  // BUG-075: a client's credit profile saved or removed on Client › Credit Profile.
  it.each([LOG_TYPE_CREDIT_PROFILE_SAVE, LOG_TYPE_CREDIT_PROFILE_DELETE])('shows a credit-report icon for %s', (logType) => {
    expect(getAvatarConfig(logType)).toEqual({ icon: 'ri-bank-card-line', bgClass: 'bg-success-subtle text-success' })
  })

  it('matches the API log types', () => {
    expect([LOG_TYPE_CREDIT_PROFILE_SAVE, LOG_TYPE_CREDIT_PROFILE_DELETE]).toEqual(['credit_profile_save', 'credit_profile_delete'])
  })
})
