import { describe, expect, it } from 'vitest'
import { additionalFundingTypeOptions, fundingTypeOptions, withoutPreferredFundingType, splitPurposes, joinPurposes } from '../../src/data/profile'

/** The Additional Funding Types choices on the funding application's Funding Request step. */
describe('additionalFundingTypeOptions', () => {
  it('is every funding type but the preferred one', () => {
    const values = additionalFundingTypeOptions('Term Loan').map((o) => o.value)

    expect(values).not.toContain('Term Loan')
    expect(values).toHaveLength(fundingTypeOptions.length - 1)
  })

  it('is every funding type while none is preferred', () => {
    expect(additionalFundingTypeOptions('')).toEqual(fundingTypeOptions)
  })
})

describe('withoutPreferredFundingType', () => {
  it('drops a chosen type once it becomes the preferred one', () => {
    expect(withoutPreferredFundingType(['SBA Loan', 'Line of Credit'], 'SBA Loan')).toEqual(['Line of Credit'])
  })

  it('keeps the others as they were', () => {
    expect(withoutPreferredFundingType(['SBA Loan'], 'Term Loan')).toEqual(['SBA Loan'])
    expect(withoutPreferredFundingType(undefined, 'Term Loan')).toEqual([])
  })
})

/**
 * Purpose of Funds takes several purposes, stored joined (", ") in the one
 * purpose_of_funds string. "Furniture, Fixtures & Equipment (FF&E)" carries its
 * own comma, so splitting reads the known purposes first.
 */
describe('splitPurposes', () => {
  it('is empty for nothing saved', () => {
    expect(splitPurposes(null)).toEqual([])
    expect(splitPurposes('  ')).toEqual([])
  })

  it('reads several purposes back', () => {
    expect(splitPurposes('Working Capital, Inventory, Payroll')).toEqual(['Working Capital', 'Inventory', 'Payroll'])
  })

  it('keeps a purpose whose name has a comma in one piece', () => {
    expect(splitPurposes('Working Capital, Furniture, Fixtures & Equipment (FF&E), Other')).toEqual([
      'Working Capital',
      'Furniture, Fixtures & Equipment (FF&E)',
      'Other',
    ])
  })

  it('matches the list regardless of case', () => {
    expect(splitPurposes('working capital, INVENTORY')).toEqual(['Working Capital', 'Inventory'])
  })

  it('reads an older single free-text purpose as the list item it means', () => {
    expect(splitPurposes('equipment')).toEqual(['Equipment Purchase'])
    expect(splitPurposes('Expansion')).toEqual(['Business Expansion'])
  })

  it('keeps a purpose that is not on the list as written', () => {
    expect(splitPurposes('Inventory, Trade show booth')).toEqual(['Inventory', 'Trade show booth'])
  })

  it('lists each purpose once', () => {
    expect(splitPurposes('Inventory, inventory, Payroll')).toEqual(['Inventory', 'Payroll'])
  })
})

describe('joinPurposes', () => {
  it('joins the chosen purposes for purpose_of_funds', () => {
    expect(joinPurposes(['Working Capital', 'Furniture, Fixtures & Equipment (FF&E)'])).toBe(
      'Working Capital, Furniture, Fixtures & Equipment (FF&E)'
    )
  })

  it('is empty for none, and reads back to what was chosen', () => {
    expect(joinPurposes([])).toBe('')
    const chosen = ['Payroll', 'Furniture, Fixtures & Equipment (FF&E)', 'Other']
    expect(splitPurposes(joinPurposes(chosen))).toEqual(chosen)
  })
})
