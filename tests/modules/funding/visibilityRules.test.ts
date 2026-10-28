import { describe, expect, it } from 'vitest'
import {
  FICO_MAX,
  FICO_MIN,
  lenderFilterOptions,
  lenderLabelFor,
  optionsWithout,
} from '../../../src/modules/funding/visibilityRules'

describe('underwriting logic rules', () => {
  // R2 BUG-011: the API takes a Min FICO of 300-850 (App\Rules\FicoScore); the input carries the same bounds.
  it('uses the FICO scale the API enforces', () => {
    expect([FICO_MIN, FICO_MAX]).toEqual([300, 850])
  })

  // R2 BUG-012: a state picked as allowed is not offered as restricted, and the other way round.
  describe('optionsWithout', () => {
    const states = [
      { label: 'Texas', value: 'TX' },
      { label: 'California', value: 'CA' },
      { label: 'New York', value: 'NY' },
    ]

    it('leaves out what the other list already holds', () => {
      expect(optionsWithout(states, ['TX'])).toEqual([
        { label: 'California', value: 'CA' },
        { label: 'New York', value: 'NY' },
      ])
    })

    it('offers everything when the other list is empty or missing', () => {
      expect(optionsWithout(states, [])).toEqual(states)
      expect(optionsWithout(states, null)).toEqual(states)
      expect(optionsWithout(states, undefined)).toEqual(states)
    })
  })

  // R2 BUG-038: a rule for a lender set to Inactive showed "Unknown Lender".
  describe('lenderLabelFor', () => {
    const activeLenders = [{ id: 1, name: 'R2 Lender Free' }]

    it('names an active lender from the active list', () => {
      expect(lenderLabelFor({ lender_id: 1 }, activeLenders)).toEqual({ name: 'R2 Lender Free', inactive: false })
    })

    it('names an inactive lender from the rule itself and flags it', () => {
      const rule = { lender_id: 7, lender: { id: 7, name: 'R2 Lender A', status: 'Inactive' } }
      expect(lenderLabelFor(rule, activeLenders)).toEqual({ name: 'R2 Lender A', inactive: true })
    })

    it('falls back to Unknown Lender only when there is no name anywhere', () => {
      expect(lenderLabelFor({ lender_id: 9 }, activeLenders)).toEqual({ name: 'Unknown Lender', inactive: false })
    })
  })

  describe('lenderFilterOptions', () => {
    it('adds the inactive lenders that have rules, tagged, after the active ones', () => {
      const options = lenderFilterOptions(
        [{ id: 1, name: 'Open Bank' }],
        [
          { lender_id: 1, lender: { id: 1, name: 'Open Bank', status: 'Active' } },
          { lender_id: 7, lender: { id: 7, name: 'Closed Bank', status: 'Inactive' } },
          { lender_id: 7, lender: { id: 7, name: 'Closed Bank', status: 'Inactive' } },
        ]
      )

      expect(options).toEqual([
        { id: 1, name: 'Open Bank' },
        { id: 7, name: 'Closed Bank (Inactive)' },
      ])
    })
  })
})
