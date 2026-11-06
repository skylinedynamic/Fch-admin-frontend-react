import { describe, expect, it } from 'vitest'
import { additionalFundingTypeOptions, fundingTypeOptionsFrom, onlyFundingTypesIn, withoutPreferredFundingType, splitPurposes, joinPurposes } from '../../src/data/profile'

/**
 * The funding types offered: the lender product categories (from the API), so
 * an application's types are the categories its lenders are matched on.
 */
describe('fundingTypeOptionsFrom', () => {
  it('offers the lender product categories, in their order', () => {
    expect(fundingTypeOptionsFrom(['Term Loan', 'Business Line of Credit'])).toEqual([
      { label: 'Term Loan', value: 'Term Loan' },
      { label: 'Business Line of Credit', value: 'Business Line of Credit' },
    ])
  })

  it('offers nothing else', () => {
    expect(fundingTypeOptionsFrom(['Term Loan']).map((o) => o.value)).toEqual(['Term Loan'])
    expect(fundingTypeOptionsFrom(undefined)).toEqual([])
  })
})

/** A saved type that is not an Active category is not kept: it has to be chosen again from the list. */
describe('onlyFundingTypesIn', () => {
  const categories = ['Term Loan', 'Business Line of Credit']

  it('keeps the saved types that are categories', () => {
    expect(onlyFundingTypesIn(categories, ['Business Line of Credit', 'Line of Credit', 'SBA Loan'])).toEqual(['Business Line of Credit'])
  })

  it('keeps everything while the categories are still loading', () => {
    expect(onlyFundingTypesIn(undefined, ['Line of Credit'])).toEqual(['Line of Credit'])
  })
})

/** The Additional Funding Types choices on the funding application's Funding Request step. */
describe('additionalFundingTypeOptions', () => {
  const options = fundingTypeOptionsFrom(['Term Loan', 'SBA Financing', 'Equipment Financing'])

  it('is the same list as Preferred, the preferred one shown but not selectable', () => {
    expect(additionalFundingTypeOptions(options, 'Term Loan')).toEqual([
      { label: 'Term Loan', value: 'Term Loan', disabled: true, badge: 'Selected as Preferred', badgeTitle: 'Already selected as the Preferred Funding Type' },
      { label: 'SBA Financing', value: 'SBA Financing', disabled: false },
      { label: 'Equipment Financing', value: 'Equipment Financing', disabled: false },
    ])
  })

  it('is every funding type, all selectable, while none is preferred', () => {
    expect(additionalFundingTypeOptions(options, '').map((o) => o.value)).toEqual(options.map((o) => o.value))
    expect(additionalFundingTypeOptions(options, '').some((o) => o.disabled)).toBe(false)
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
