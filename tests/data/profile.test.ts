import { describe, expect, it } from 'vitest'
import { additionalFundingTypeOptions, fundingTypeOptions, withoutPreferredFundingType } from '../../src/data/profile'

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
