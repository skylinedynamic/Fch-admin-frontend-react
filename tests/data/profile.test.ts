import { describe, expect, it } from 'vitest'
import { additionalFundingTypeOptions, fundingTypeOptionsFrom, onlyFundingTypesIn, withoutPreferredFundingType, splitPurposes, joinPurposes, purposeOptionsFrom } from '../../src/data/profile'

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
/**
 * Purpose of Funds comes from the API (GET /common/funding-purposes - the
 * backend's one list); these tests use a copy of it.
 */
const PURPOSES = [
  'Accounts Receivable', 'Business Acquisition', 'Business Expansion', 'Business Line of Credit',
  'Commercial Real Estate Purchase', 'Commercial Real Estate Refinance', 'Debt Refinance / Consolidation',
  'Equipment Lease', 'Equipment Purchase', 'Franchise Purchase', 'Furniture, Fixtures & Equipment (FF&E)',
  'Ground-Up Construction', 'Inventory', 'Land Purchase / Development', 'Marketing / Advertising',
  'Owner Occupied Commercial Property', 'Partner Buyout', 'Payroll', 'Professional Services',
  'Renovation / Tenant Improvements', 'Startup Costs', 'Technology / Software', 'Transportation / Fleet',
  'Working Capital', 'Other',
]
const split = (raw: string | null | undefined) => splitPurposes(raw, PURPOSES)

describe('purposeOptionsFrom', () => {
  it('offers the purposes from the API, in their order', () => {
    expect(purposeOptionsFrom(['Working Capital', 'Payroll'])).toEqual([
      { label: 'Working Capital', value: 'Working Capital' },
      { label: 'Payroll', value: 'Payroll' },
    ])
    expect(purposeOptionsFrom(undefined)).toEqual([])
  })
})

describe('splitPurposes with the list from the API', () => {
  it('keeps a comma inside a purpose only when the list has that purpose', () => {
    expect(splitPurposes('Furniture, Fixtures & Equipment (FF&E)', PURPOSES)).toEqual(['Furniture, Fixtures & Equipment (FF&E)'])
    expect(splitPurposes('Furniture, Fixtures & Equipment (FF&E)', [])).toEqual(['Furniture', 'Fixtures & Equipment (FF&E)'])
  })

  it('reads each older free-text purpose as the list item it means', () => {
    expect(splitPurposes('new equipment', PURPOSES)).toEqual(['Equipment Purchase'])
    expect(splitPurposes('inventory restock', PURPOSES)).toEqual(['Inventory'])
    expect(splitPurposes('payroll costs', PURPOSES)).toEqual(['Payroll'])
    expect(splitPurposes('real estate', PURPOSES)).toEqual(['Commercial Real Estate Purchase'])
    expect(splitPurposes('new property', PURPOSES)).toEqual(['Commercial Real Estate Purchase'])
    expect(splitPurposes('line of credit', PURPOSES)).toEqual(['Business Line of Credit'])
    expect(splitPurposes('expansion', PURPOSES)).toEqual(['Business Expansion'])
    expect(splitPurposes('acquisition', PURPOSES)).toEqual(['Business Acquisition'])
    // Nothing it means: kept as written.
    expect(splitPurposes('trade show booth', PURPOSES)).toEqual(['trade show booth'])
  })

  it('reads an older free-text purpose as a list item only when the list has it', () => {
    expect(splitPurposes('equipment', PURPOSES)).toEqual(['Equipment Purchase'])
    expect(splitPurposes('equipment', ['Working Capital'])).toEqual(['equipment'])
  })
})

describe('splitPurposes', () => {
  it('is empty for nothing saved', () => {
    expect(split(null)).toEqual([])
    expect(split('  ')).toEqual([])
  })

  it('reads several purposes back', () => {
    expect(split('Working Capital, Inventory, Payroll')).toEqual(['Working Capital', 'Inventory', 'Payroll'])
  })

  it('keeps a purpose whose name has a comma in one piece', () => {
    expect(split('Working Capital, Furniture, Fixtures & Equipment (FF&E), Other')).toEqual([
      'Working Capital',
      'Furniture, Fixtures & Equipment (FF&E)',
      'Other',
    ])
  })

  it('matches the list regardless of case', () => {
    expect(split('working capital, INVENTORY')).toEqual(['Working Capital', 'Inventory'])
  })

  it('reads an older single free-text purpose as the list item it means', () => {
    expect(split('equipment')).toEqual(['Equipment Purchase'])
    expect(split('Expansion')).toEqual(['Business Expansion'])
  })

  it('keeps a purpose that is not on the list as written', () => {
    expect(split('Inventory, Trade show booth')).toEqual(['Inventory', 'Trade show booth'])
  })

  it('lists each purpose once', () => {
    expect(split('Inventory, inventory, Payroll')).toEqual(['Inventory', 'Payroll'])
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
    expect(split(joinPurposes(chosen))).toEqual(chosen)
  })
})
