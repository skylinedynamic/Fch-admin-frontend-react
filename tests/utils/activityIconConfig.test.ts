import { describe, expect, it } from 'vitest'
import { getAvatarConfig } from '../../src/utils/activityIconConfig'
import { LOG_TYPE_PARTNER_CONFIGURATION_UPDATE, LOG_TYPE_PARTNER_UPDATE } from '../../src/config/appConfig'

describe('getAvatarConfig', () => {
  // The host changed one of the partner's settings from Partner profile › Configuration.
  it('shows a settings icon for a partner configuration change', () => {
    expect(getAvatarConfig(LOG_TYPE_PARTNER_CONFIGURATION_UPDATE)).toEqual({
      icon: 'ri-settings-3-line',
      bgClass: 'bg-primary-subtle text-primary',
    })
  })

  it('keeps the team icon for other partner events', () => {
    expect(getAvatarConfig(LOG_TYPE_PARTNER_UPDATE)?.icon).toBe('ri-team-line')
  })
})
