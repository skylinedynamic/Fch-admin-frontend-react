import { describe, expect, it } from 'vitest'
import {
  PARTNER_CONFIGURATION_PERMISSION,
  canManagePartnerConfiguration,
  partnerConfigurationSections,
} from '../../src/config/partnerConfiguration'
import { PARTNER_TYPES } from '../../src/config/partnerTypeOptions'

/**
 * Partner profile › Configuration: shown to a host user holding the permission,
 * for a partner that exists; its sections follow the partner's type the way the
 * partner's own Settings page does.
 */
const allow = (name: string) => name === PARTNER_CONFIGURATION_PERMISSION
const deny = () => false

describe('canManagePartnerConfiguration', () => {
  it('is true for a host user with the permission on an existing partner', () => {
    expect(canManagePartnerConfiguration({ is_host: 1 }, allow, 42)).toBe(true)
  })

  it.each([
    ['without the permission', { is_host: 1 }, deny, 42],
    ['for a non-host user', { is_host: 0 }, allow, 42],
    ['for a partner not yet created', { is_host: 1 }, allow, undefined],
    ['for nobody signed in', null, allow, 42],
  ])('is false %s', (_label, user, can, partnerId) => {
    expect(canManagePartnerConfiguration(user as never, can, partnerId as never)).toBe(false)
  })
})

describe('partnerConfigurationSections', () => {
  const everything = () => true

  it('gives a white-label partner Email, SMS, Branding and Payment', () => {
    expect(partnerConfigurationSections({ partner_type: PARTNER_TYPES.WHITE_LABEL }, everything).map((s) => s.id)).toEqual([
      'email_configuration', 'sms_configuration', 'branding', 'payment',
    ])
  })

  it('gives a certified partner only Payment - it uses the host\'s mail, SMS and branding', () => {
    expect(partnerConfigurationSections({ partner_type: 'Certified Partner' }, everything).map((s) => s.id)).toEqual(['payment'])
  })

  // The API guards these two with the same permissions as the Settings page,
  // so a section the user cannot open is not offered (it would answer 403).
  it('leaves out Email and SMS when the user lacks their settings permissions', () => {
    const only = (granted: string[]) => (name: string) => granted.includes(name)

    expect(partnerConfigurationSections({ partner_type: PARTNER_TYPES.WHITE_LABEL }, only(['update email configuration settings'])).map((s) => s.id))
      .toEqual(['email_configuration', 'branding'])
    expect(partnerConfigurationSections({ partner_type: PARTNER_TYPES.WHITE_LABEL }, only(['update sms configuration settings'])).map((s) => s.id))
      .toEqual(['sms_configuration', 'branding'])
  })

  it('offers Payment only with the payment settings permission; Branding needs nothing more', () => {
    const only = (granted: string[]) => (name: string) => granted.includes(name)

    expect(partnerConfigurationSections({ partner_type: PARTNER_TYPES.WHITE_LABEL }, only([])).map((s) => s.id)).toEqual(['branding'])
    expect(partnerConfigurationSections({ partner_type: 'Certified Partner' }, only([])).map((s) => s.id)).toEqual([])
    expect(partnerConfigurationSections({ partner_type: 'Certified Partner' }, only(['update payment settings'])).map((s) => s.id)).toEqual(['payment'])
  })
})
