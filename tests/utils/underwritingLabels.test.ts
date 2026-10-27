import { describe, expect, it } from 'vitest'
import { readableLabel } from '../../src/utils/underwritingLabels'

/**
 * BUG-061: the client's underwriting result showed the agent's internal keys
 * (borrower.full_name, derived.monthly_operating_cash_flow_stress_test) and
 * source codes (BORROWER_REPORTED, DERIVED_FROM_SUPPLIED_DATA, NOT_PROVIDED).
 */
describe('readableLabel', () => {
  it.each([
    ['borrower.full_name', 'Full Name'],
    ['borrower.business_name', 'Business Name'],
    ['derived.monthly_operating_cash_flow_stress_test', 'Monthly Operating Cash Flow Stress Test'],
    ['BORROWER_REPORTED', 'Borrower Reported'],
    ['DERIVED_FROM_SUPPLIED_DATA', 'Derived Data'],
    ['NOT_PROVIDED', 'Not Provided'],
    ['THIRD_PARTY_VERIFIED', 'Third Party Verified'],
  ])('%s reads as %s', (raw, expected) => {
    expect(readableLabel(raw)).toBe(expected)
  })

  it.each([
    'Time in Business',
    'QA-TEST Cert Client LLC',
    'FICO',
    'U.S.',
    '$40,000',
    'Limited Liability Company (LLC)',
    'ajoy@example.dev',
  ])('leaves ordinary text alone: %s', text => {
    expect(readableLabel(text)).toBe(text)
  })
})
