import { describe, expect, it } from 'vitest'
import { mapPartnerBackendErrors } from '../../../src/modules/partner/logic'

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
