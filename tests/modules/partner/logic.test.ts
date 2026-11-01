import { describe, expect, it } from 'vitest'
import { defaultInstallmentMonths, mapPartnerBackendErrors, partnerOptionLabel } from '../../../src/modules/partner/logic'

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
