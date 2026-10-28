import { describe, expect, it } from 'vitest'
import { DEFAULT_LEAD_COUNTRY, LEAD_CONVERT_REQUIRED_FIELDS, isMissingConvertInfo, isLeadTypeLocked, leadCountryFor, leadOwnerOptions, leadTeamPartnerId, showsLeadType } from '../../../src/modules/leads/logic'

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

const HOST = { is_host: 1, partner_id: 1 }
const WLP_USER = { is_host: 0, partner_id: 2 }

describe('leadTeamPartnerId', () => {
  it('is the lead partner when the host works another partner\'s lead', () => {
    expect(leadTeamPartnerId(HOST, { partner: { id: 2 } })).toBe(2)
  })

  it('is nothing - the caller\'s own team - for any other lead or caller', () => {
    expect(leadTeamPartnerId(HOST, { partner: { id: 1 } })).toBeNull()
    expect(leadTeamPartnerId(HOST, { partner: null })).toBeNull()
    expect(leadTeamPartnerId(HOST, null)).toBeNull()
    expect(leadTeamPartnerId(WLP_USER, { partner: { id: 2 } })).toBeNull()
    expect(leadTeamPartnerId(WLP_USER, { partner: { id: 3 } })).toBeNull()
  })
})

describe('showsLeadType', () => {
  it('shows the host every lead\'s type - its own and other partners\'', () => {
    expect(showsLeadType(HOST)).toBe(true)
  })

  it('never shows it to a white-label or certified partner, whose leads are all Borrower leads', () => {
    expect(showsLeadType(WLP_USER)).toBe(false)
    expect(showsLeadType(null)).toBe(false)
  })
})

describe('leadOwnerOptions', () => {
  const TEAM = [{ id: 5, name: 'Wil Label' }, { id: 6, name: 'Sal Person' }]

  it('lists the team as owner options', () => {
    expect(leadOwnerOptions(TEAM, { salesperson_id: 6, salesperson_name: 'Sal Person' })).toEqual([
      { label: 'Wil Label', value: 5 },
      { label: 'Sal Person', value: 6 },
    ])
  })

  it('keeps the lead\'s current owner showing when the team does not include them', () => {
    expect(leadOwnerOptions(TEAM, { salesperson_id: 9, salesperson_name: 'Old Owner' })).toEqual([
      { label: 'Wil Label', value: 5 },
      { label: 'Sal Person', value: 6 },
      { label: 'Old Owner', value: 9 },
    ])
  })

  it('adds nothing for a lead with no owner, or a new one', () => {
    expect(leadOwnerOptions(TEAM, { salesperson_id: null, salesperson_name: null })).toHaveLength(2)
    expect(leadOwnerOptions(TEAM, null)).toHaveLength(2)
    expect(leadOwnerOptions(null, null)).toEqual([])
  })
})

describe('isLeadTypeLocked', () => {
  it('locks a converted lead\'s type', () => {
    expect(isLeadTypeLocked(HOST, { partner: { id: 1 }, convert_to: 'Partner' })).toBe(true)
    expect(isLeadTypeLocked(HOST, { partner: { id: 1 }, convert_to: 'Borrower' })).toBe(true)
  })

  it('locks another partner\'s lead, which is always a Borrower lead', () => {
    expect(isLeadTypeLocked(HOST, { partner: { id: 2 }, convert_to: null })).toBe(true)
  })

  it('leaves the host\'s own lead not yet converted, or a new one, editable', () => {
    expect(isLeadTypeLocked(HOST, { partner: { id: 1 }, convert_to: null })).toBe(false)
    expect(isLeadTypeLocked(HOST, { partner: null })).toBe(false)
    expect(isLeadTypeLocked(HOST, null)).toBe(false)
  })
})

// R2 BUG-065: Contact Info showed Country "United States" but saving said
// "Country is required." - the default was shown but never put into the form.
describe('leadCountryFor', () => {
  it("keeps the lead's own country, by name", () => {
    expect(leadCountryFor('Canada')).toBe('Canada')
  })

  it("gives a lead without one the platform's default, so the form sends what it shows", () => {
    expect(leadCountryFor(null)).toBe(DEFAULT_LEAD_COUNTRY)
    expect(leadCountryFor('')).toBe(DEFAULT_LEAD_COUNTRY)
    expect(leadCountryFor(undefined)).toBe('United States')
  })
})
