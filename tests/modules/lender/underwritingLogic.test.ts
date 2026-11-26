import { describe, expect, it } from 'vitest'
import {
  blankRule,
  configuredRows,
  configuredTypeIds,
  filterRows,
  fundingTypeOptions,
  isRuleBlank,
  lenderSaveMessage,
  remapUnderwritingErrors,
  rowsForFundingTypes,
  underwritingErrorIndexes,
  underwritingPayload,
} from '../../../src/modules/lender/underwritingLogic'

/**
 * Edit Lender > Underwriting Logic (moved from Funding Sequence): one row per
 * funding type of the lender, always. The Funding Types select only filters
 * which rows show - taking a type out of the filter never removes its rule.
 * Only filled-in rows are saved; a rule is removed by its delete (confirmed).
 */
const CATEGORIES = [
  { id: 1, name: 'Term Loan' },
  { id: 2, name: 'Business Line of Credit' },
  { id: 3, name: 'Equipment Financing' },
]

describe('Underwriting Logic › funding type options', () => {
  it('lists the lender\'s funding types, in the lender\'s order, by name', () => {
    expect(fundingTypeOptions([3, '1'], CATEGORIES)).toEqual([
      { label: 'Equipment Financing', value: 3 },
      { label: 'Term Loan', value: 1 },
    ])
  })

  it('leaves out an id no category has', () => {
    expect(fundingTypeOptions([1, 99], CATEGORIES)).toEqual([{ label: 'Term Loan', value: 1 }])
  })
})

describe('Underwriting Logic › one row per funding type', () => {
  it('keeps each saved rule and adds an empty row for a funding type without one, in the lender\'s order', () => {
    const termLoan = { ...blankRule(1), id: 10, min_fico: 640 }
    const rows = rowsForFundingTypes([termLoan], [2, '1'])

    expect(rows.map((r) => r.lender_product_category_id)).toEqual([2, 1])
    expect(rows[0]).toEqual(blankRule(2))
    expect(rows[1]).toBe(termLoan)
  })

  it('drops the row of a funding type taken off the lender', () => {
    expect(rowsForFundingTypes([blankRule(1), { ...blankRule(2), min_fico: 700 }], [2]).map((r) => r.lender_product_category_id)).toEqual([2])
  })

  it('returns the same rows when the funding types did not change', () => {
    const rows = [blankRule(1), blankRule(2)]
    expect(rowsForFundingTypes(rows, [1, 2])).toBe(rows)
  })
})

describe('Underwriting Logic › the funding types shown', () => {
  const rows = [blankRule(1), blankRule(2), blankRule(3)]

  it('shows no row when nothing is picked', () => {
    expect(filterRows(rows, [])).toEqual([])
  })

  it('starts with the funding types that have logic', () => {
    expect(configuredTypeIds([blankRule(1), { ...blankRule(2), min_fico: 650 }, { ...blankRule(3), id: 7, min_fico: 600 }])).toEqual([2, 3])
  })

  it('shows only the picked funding types, keeping each row\'s place', () => {
    expect(filterRows(rows, [3, 1])).toEqual([{ row: rows[0], index: 0 }, { row: rows[2], index: 2 }])
  })
})

describe('Underwriting Logic › blank and configured rows', () => {
  it('a row with nothing filled in is blank', () => {
    expect(isRuleBlank(blankRule(1))).toBe(true)
    expect(isRuleBlank({ ...blankRule(1), min_tib_months: 0 })).toBe(false)
    expect(isRuleBlank({ ...blankRule(1), restricted_states: ['Texas'] })).toBe(false)
  })

  it('saves only the rows filled in, and says which row each one was', () => {
    const rows = [blankRule(1), { ...blankRule(2), min_fico: 650 }, blankRule(3)]
    expect(configuredRows(rows)).toEqual({ rows: [rows[1]], indexes: [1] })
  })

  // A funding type picked but left empty is sent, so its required fields are refused.
  it('also saves an empty row that is shown', () => {
    const rows = [blankRule(1), { ...blankRule(2), min_fico: 650 }, blankRule(3)]
    expect(configuredRows(rows, [3])).toEqual({ rows: [rows[1], rows[2]], indexes: [1, 2] })
  })

  it('moves an API error from the sent rule to its row', () => {
    expect(remapUnderwritingErrors({ 'underwriting_logic.0.min_fico': 'bad', name: 'x' }, [1])).toEqual({ 'underwriting_logic.1.min_fico': 'bad', name: 'x' })
  })
})

describe('Underwriting Logic › what is saved', () => {
  it('sends empty fields as null and keeps the lists', () => {
    const [sent] = underwritingPayload([{
      ...blankRule(2), id: 5, min_fico: '650', min_dscr: '', allowed_states: ['Texas'], restricted_industries: ['', 'Gaming'],
    }])

    expect(sent).toMatchObject({
      lender_product_category_id: 2,
      min_fico: '650',
      min_dscr: null,
      allowed_states: ['Texas'],
      restricted_industries: ['Gaming'],
    })
    expect(sent).not.toHaveProperty('id')
  })
})

/** The toast after Save / Update says what was saved. */
describe('Lender save message', () => {
  const one = underwritingPayload([{ ...blankRule(1), min_fico: 650 }])
  const changed = underwritingPayload([{ ...blankRule(1), min_fico: 700 }])
  const two = underwritingPayload([{ ...blankRule(1), min_fico: 650 }, blankRule(2)])

  it.each([
    ['a new lender', { isEdit: false, detailsChanged: true, rulesBefore: [], rulesAfter: [] }, 'Lender created successfully'],
    ['lender details only', { isEdit: true, detailsChanged: true, rulesBefore: one, rulesAfter: one }, 'Lender updated successfully'],
    ['nothing changed', { isEdit: true, detailsChanged: false, rulesBefore: one, rulesAfter: one }, 'Lender updated successfully'],
    ['first underwriting logic', { isEdit: true, detailsChanged: false, rulesBefore: [], rulesAfter: one }, 'Underwriting logic saved successfully'],
    ['a rule changed', { isEdit: true, detailsChanged: false, rulesBefore: one, rulesAfter: changed }, 'Underwriting logic updated successfully'],
    ['a funding type added', { isEdit: true, detailsChanged: false, rulesBefore: one, rulesAfter: two }, 'Underwriting logic updated successfully'],
    ['every rule removed', { isEdit: true, detailsChanged: false, rulesBefore: one, rulesAfter: [] }, 'Underwriting logic removed successfully'],
    ['details and rules', { isEdit: true, detailsChanged: true, rulesBefore: one, rulesAfter: changed }, 'Lender and underwriting logic updated successfully'],
    // Update pressed on the Underwriting Logic tab: always an underwriting message.
    ['Update on Underwriting Logic, nothing changed', { isEdit: true, detailsChanged: false, rulesBefore: one, rulesAfter: one, fromUnderwriting: true }, 'Underwriting logic updated successfully'],
    ['Update on Underwriting Logic, rules changed', { isEdit: true, detailsChanged: false, rulesBefore: one, rulesAfter: changed, fromUnderwriting: true }, 'Underwriting logic updated successfully'],
  ])('%s', (_label, input, expected) => {
    expect(lenderSaveMessage(input)).toBe(expected)
  })
})

describe('Underwriting Logic › errors', () => {
  it('names the rows the API refused', () => {
    expect(underwritingErrorIndexes({ 'underwriting_logic.1.min_fico': 'x', 'underwriting_logic.1.min_tib_months': 'y', name: 'z' })).toEqual([1])
  })
})
