import { describe, expect, it } from 'vitest'
import { nextTierRow, tierForPosition, tierRangeLabel } from '../../../src/modules/partner/tiers'

describe('nextTierRow', () => {
  it('starts the new tier right after the last one ends', () => {
    expect(nextTierRow([{ min_count: 0, max_count: 10 }], { payout_type: 'Commission', amount: '' }))
      .toEqual({ min_count: 11, max_count: '', payout_type: 'Commission', amount: '' })
  })

  it('cannot guess a start when the last tier has no end', () => {
    expect(nextTierRow([{ min_count: 0, max_count: '' }], { percentage: '' }))
      .toEqual({ min_count: '', max_count: '', percentage: '' })
  })

  it('starts at 0 when there are no tiers yet', () => {
    expect(nextTierRow([], { percentage: '' })).toEqual({ min_count: 0, max_count: '', percentage: '' })
  })
})

describe('tierForPosition', () => {
  const rows = [
    { min_count: 0, max_count: 10, percentage: 10 },
    { min_count: '11', max_count: '20', percentage: 12 },
    { min_count: 21, max_count: '', percentage: 15 },
  ]

  it.each([
    [1, 0],
    [10, 0],
    [11, 1],
    [20, 1],
    [21, 2],
    [400, 2],
  ])('deal #%i falls in tier %i', (position, index) => {
    expect(tierForPosition(rows, position)).toBe(index)
  })

  it('is -1 when no tier holds the deal', () => {
    expect(tierForPosition([{ min_count: 0, max_count: 5 }], 6)).toBe(-1)
    expect(tierForPosition([], 1)).toBe(-1)
  })
})

describe('tierRangeLabel', () => {
  it('reads a range, an open end, and a lone tier for every deal', () => {
    expect(tierRangeLabel({ min_count: 0, max_count: 10 })).toBe('0–10')
    expect(tierRangeLabel({ min_count: 21, max_count: '' })).toBe('21+')
    expect(tierRangeLabel({ min_count: 21, max_count: null })).toBe('21+')
  })
})
