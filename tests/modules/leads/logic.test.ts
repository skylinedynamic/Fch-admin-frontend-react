import { describe, expect, it } from 'vitest'
import { LEAD_CONVERT_REQUIRED_FIELDS, isMissingConvertInfo } from '../../../src/modules/leads/logic'

const complete = {
  contact_person: 'Awlad Leo',
  email: 'awlad@example.test',
  phone_number: '(675) 675-6765',
  country: 'United States',
}

describe('isMissingConvertInfo', () => {
  it('needs only the fields the missing-info form marks required', () => {
    expect(LEAD_CONVERT_REQUIRED_FIELDS).toEqual(['contact_person', 'email', 'phone_number', 'country'])
  })

  it('does not count an empty state or city as missing', () => {
    expect(isMissingConvertInfo({ ...complete, state: '', city: null })).toBe(false)
    expect(isMissingConvertInfo(complete)).toBe(false)
  })

  it.each(LEAD_CONVERT_REQUIRED_FIELDS)('counts a lead with no %s as missing', (field) => {
    expect(isMissingConvertInfo({ ...complete, [field]: '' })).toBe(true)
    expect(isMissingConvertInfo({ ...complete, [field]: null })).toBe(true)
    expect(isMissingConvertInfo({ ...complete, [field]: '   ' })).toBe(true)
  })

  it('counts no lead at all as missing', () => {
    expect(isMissingConvertInfo(null)).toBe(true)
  })
})
