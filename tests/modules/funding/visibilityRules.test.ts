import { describe, expect, it } from 'vitest'
import {
  lenderFilterOptions,
  lenderLabelFor,
  optionsWithout,
} from '../../../src/modules/funding/visibilityRules'

describe('underwriting logic rules', () => {
  // R2 BUG-010: a state picked as allowed is not offered as restricted, and the other way round.
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

  // R2 BUG-030: a rule for a lender set to Inactive showed "Unknown Lender".
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

      expect(options.map(({ id, name, inactive }) => ({ id, name, inactive }))).toEqual([
        { id: 1, name: 'Open Bank', inactive: false },
        { id: 7, name: 'Closed Bank (Inactive)', inactive: true },
      ])
    })
  })

  // R2 BUG-008: two lenders may share a name; each is shown with its legal name.
  describe('lenders named with their legal name', () => {
    const kabbage = { id: 1, name: 'Kabbage', legal_name: 'Kabbage Inc.', display_name: 'Kabbage - Kabbage Inc.' }

    it('labels an active lender "Lender Name - Legal Name"', () => {
      expect(lenderLabelFor({ lender_id: 1 }, [kabbage])).toEqual({ name: 'Kabbage - Kabbage Inc.', inactive: false })
    })

    it("labels an inactive lender from the rule's own lender the same way", () => {
      const rule = { lender_id: 7, lender: { id: 7, name: 'Kabbage', legal_name: 'Kabbage Funding LLC', display_name: 'Kabbage - Kabbage Funding LLC', status: 'Inactive' } }
      expect(lenderLabelFor(rule, [kabbage])).toEqual({ name: 'Kabbage - Kabbage Funding LLC', inactive: true })
    })

    it('lists both in Filter by Lender, told apart', () => {
      const options = lenderFilterOptions(
        [kabbage],
        [{ lender_id: 7, lender: { id: 7, name: 'Kabbage', legal_name: 'Kabbage Funding LLC', status: 'Inactive' } }]
      )

      expect(options.map(o => o.name)).toEqual(['Kabbage - Kabbage Inc.', 'Kabbage - Kabbage Funding LLC (Inactive)'])
    })
  })

  // 2026-11-11: a dropdown names a lender "Lender Name - Lender Code" (a name
  // and a legal name may repeat, the code never does); a rule row keeps
  // "Lender Name - Legal Name".
  describe('lenders with a Lender Code', () => {
    const one = { id: 1, lender_code: 'LND-1111', name: 'Kabbage', legal_name: 'Kabbage Inc.', display_name: 'Kabbage - Kabbage Inc.' }
    const inactiveRule = { lender_id: 7, lender: { id: 7, lender_code: 'LND-7777', name: 'Kabbage', legal_name: 'Kabbage Inc.', display_name: 'Kabbage - Kabbage Inc.', status: 'Inactive' } }

    it('names each lender in Filter by Lender by its name and Lender Code', () => {
      const options = lenderFilterOptions([one], [inactiveRule])

      // `name` is what the dropdown search matches; the parts are what it shows.
      expect(options.map(o => o.name)).toEqual(['Kabbage - LND-1111', 'Kabbage - LND-7777 (Inactive)'])
      expect(options.map(o => [o.lenderName, o.code, o.inactive])).toEqual([
        ['Kabbage', 'LND-1111', false],
        ['Kabbage', 'LND-7777', true],
      ])
    })

    it('keeps "Lender Name - Legal Name" on a rule row', () => {
      expect(lenderLabelFor({ lender_id: 1 }, [one])).toEqual({ name: 'Kabbage - Kabbage Inc.', inactive: false })
    })
  })
})
