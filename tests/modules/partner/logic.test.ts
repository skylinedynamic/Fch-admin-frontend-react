import { describe, expect, it } from 'vitest'
import { buildPartnerFormDataPayload, defaultInstallmentMonths, mapPartnerBackendErrors, partnerOptionLabel, partnerPortalBaseHost } from '../../../src/modules/partner/logic'

describe('mapPartnerBackendErrors', () => {
  it('keeps each field\'s message, whether the API sends a string or a list', () => {
    expect(mapPartnerBackendErrors({
      contact_person_phone_number: 'Enter a valid 10-digit US phone number, e.g. (555) 234-5678.',
      tax_id: ['Enter a 9-digit EIN as XX-XXXXXXX, e.g. 12-3456789.'],
    })).toEqual({
      contact_person_phone_number: 'Enter a valid 10-digit US phone number, e.g. (555) 234-5678.',
      tax_id: 'Enter a 9-digit EIN as XX-XXXXXXX, e.g. 12-3456789.',
    })
  })

  it('puts the create endpoint\'s zip_code error on the form\'s postal_code field', () => {
    expect(mapPartnerBackendErrors({ zip_code: 'Enter a 5-digit ZIP code.' })).toEqual({ postal_code: 'Enter a 5-digit ZIP code.' })
  })

  it('maps enrollment errors to the fields that show them', () => {
    expect(mapPartnerBackendErrors({ 'enrollment.amount': ['Required.'] })).toEqual({ enrollment_amount: 'Required.' })
  })
})

describe('partnerOptionLabel', () => {
  it('is the company with the name in brackets', () => {
    expect(partnerOptionLabel({ id: 2, full_name: 'Wil Label', company_name: 'WLP Co' })).toBe('WLP Co (Wil Label)')
  })

  it('is whichever of the two a partner has', () => {
    expect(partnerOptionLabel({ id: 2, full_name: 'Wil Label', company_name: null })).toBe('Wil Label')
    expect(partnerOptionLabel({ id: 2, full_name: '', company_name: 'WLP Co' })).toBe('WLP Co')
  })

  it('falls back to the partner number with neither', () => {
    expect(partnerOptionLabel({ id: 9, full_name: '', company_name: null })).toBe('Partner #9')
  })
})

// BUG-114: 12 months by default, never more than the plan's "Installment Upto".
describe('defaultInstallmentMonths', () => {
  it('is 12 when the plan allows more', () => {
    expect(defaultInstallmentMonths({ total_installment_count_upto: 24 })).toBe(12)
  })

  it("is the plan's limit when that is under 12", () => {
    expect(defaultInstallmentMonths({ total_installment_count_upto: 11 })).toBe(11)
    expect(defaultInstallmentMonths({ total_installment_count_upto: 6 })).toBe(6)
  })

  it('is 12 when the plan sets no limit', () => {
    expect(defaultInstallmentMonths({ total_installment_count_upto: null })).toBe(12)
    expect(defaultInstallmentMonths(undefined)).toBe(12)
  })

  it("follows the API's installment_default_months when it sends one", () => {
    expect(defaultInstallmentMonths({ total_installment_count_upto: 24, installment_default_months: 9 })).toBe(9)
  })
})

// R2 BUG-050: emptying Address or Contact Person and saving kept the old value -
// an emptied field was left out of the update, so the API never saw it cleared.
describe('buildPartnerFormDataPayload - clearing optional fields', () => {
  const editForm = {
    full_name: 'Partner 83',
    company_name: 'QA Co',
    address_line_1: '',
    contact_person: '',
    contact_person_email: '',
    city: 'Austin',
  }

  it('sends an emptied optional field as empty on an edit', () => {
    const payload = buildPartnerFormDataPayload(editForm, 83)

    expect(payload.get('address_line_1')).toBe('')
    expect(payload.get('contact_person')).toBe('')
    expect(payload.get('contact_person_email')).toBe('')
    expect(payload.get('city')).toBe('Austin')
  })

  it('still leaves empty fields out when creating, and never blanks a required one', () => {
    const create = buildPartnerFormDataPayload(editForm)
    expect(create.has('address_line_1')).toBe(false)

    const edit = buildPartnerFormDataPayload({ ...editForm, company_name: '' }, 83)
    expect(edit.has('company_name')).toBe(false)
  })
})

// BUG-203: the form keeps the login's email state beside the field - read-only,
// never sent back. The field itself carries the pending email while one waits.
describe('buildPartnerFormDataPayload - sign-in email state', () => {
  it('sends the field email but none of the login state kept beside it', () => {
    const payload = buildPartnerFormDataPayload(
      { full_name: 'Acme Owner', email: 'new@example.test', pending_email: 'new@example.test', signin_email: 'old@example.test', login_user_id: 41 },
      83
    )

    expect(payload.get('email')).toBe('new@example.test')
    expect(payload.has('pending_email')).toBe(false)
    expect(payload.has('signin_email')).toBe(false)
    expect(payload.has('login_user_id')).toBe(false)
  })
})

describe('buildPartnerFormDataPayload - commission', () => {
  it('leaves the commission out: the Commissions tab saves it through its own endpoint', () => {
    const payload = buildPartnerFormDataPayload(
      { full_name: 'Acme Owner', commission: 25, commission_tiers: [{ id: 1, min_count: 0, max_count: null, percentage: 25 }], funded_deal_count: 3 },
      83
    )

    expect(payload.get('full_name')).toBe('Acme Owner')
    expect(payload.has('commission')).toBe(false)
    expect(payload.has('commission_tiers')).toBe(false)
    expect(payload.has('funded_deal_count')).toBe(false)
  })
})

describe('partnerPortalBaseHost', () => {
  it.each([
    ['https://fourcornerfunding.com/', 'fourcornerfunding.com'],
    ['http://localhost:3000/', 'localhost:3000'],
    ['https://fourcornerfunding.com/blog', 'fourcornerfunding.com'],
    ['fourcornerfunding.com', 'fourcornerfunding.com'],
    ['localhost:3000', 'localhost:3000'],
    ['  https://fourcornerfunding.com  ', 'fourcornerfunding.com'],
  ])('reads the host from %s', (websiteUrl, host) => {
    expect(partnerPortalBaseHost(websiteUrl, 'portal.test')).toBe(host)
  })

  it.each([[''], ['   ']])('falls back to the current host when the website url is %j', (websiteUrl) => {
    expect(partnerPortalBaseHost(websiteUrl, 'portal.test')).toBe('portal.test')
  })
})

/**
 * Defect (R2 BUG-088, R2-OP-PART-15): two tabs on partner 93; tab B, not
 * reloaded, saved its whole stale form and put back the phone tab A had
 * changed - 200, no warning. Like the client form, an edit now sends the
 * version it loaded (partner_info_version) as expected_version; the API refuses
 * a save from an older copy (409) and the form shows its message.
 */
describe('buildPartnerFormDataPayload - the version the form loaded', () => {
  const loaded = { full_name: 'Pat', company_name: 'QA-TEST R2R2 Partner A', phone_number: '(813) 555-0111', partner_info_version: 'abc123' }

  it('sends it as expected_version on an edit, and never as partner_info_version', () => {
    const payload = buildPartnerFormDataPayload(loaded, 93)

    expect(payload.get('expected_version')).toBe('abc123')
    expect(payload.has('partner_info_version')).toBe(false)
  })

  it('sends none when adding a partner', () => {
    const payload = buildPartnerFormDataPayload({ full_name: 'Pat', partner_info_version: 'abc123' })

    expect(payload.has('expected_version')).toBe(false)
    expect(payload.has('partner_info_version')).toBe(false)
  })
})
