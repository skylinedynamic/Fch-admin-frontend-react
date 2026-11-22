import { describe, expect, it } from 'vitest'
import { SETTINGS_ACCESS_PERMISSIONS } from '../../src/config/settingsSections'
import { CALENDLY_CONFIGURATION_PERMISSION } from '../../src/config/calendlyConfiguration'

describe('SETTINGS_ACCESS_PERMISSIONS', () => {
  it('lets a host with only the Calendly Configuration permission into Settings', () => {
    expect(SETTINGS_ACCESS_PERMISSIONS).toContain(CALENDLY_CONFIGURATION_PERMISSION)
  })

  it('keeps every permission that opened Settings before', () => {
    expect(SETTINGS_ACCESS_PERMISSIONS).toEqual(expect.arrayContaining([
      'update payment settings', 'update partner agreement settings', 'update borrower agreement settings',
      'update email configuration settings', 'update sms configuration settings', 'update branding settings',
      'update domain configuration settings', 'update microbilt settings',
    ]))
  })
})
