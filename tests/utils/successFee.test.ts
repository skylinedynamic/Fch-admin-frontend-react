import { describe, expect, it } from 'vitest'
import { successFeeError, SUCCESS_FEE_RANGE_MESSAGE, SUCCESS_FEE_DECIMALS_MESSAGE } from '../../src/utils/successFee'

/**
 * Defect (R2 BUG-079): the Closed (Completed) Success Fee took 12.345 (the API
 * stored 12.35, so the amount confirmed was not the amount saved), and 101 / -1
 * were dropped silently. The fee is 1-100% to the hundredth, and a value
 * outside that gets a reason; an empty fee means "no commission" and is fine.
 */
describe('successFeeError', () => {
  it.each(['1', '7.5', '12.35', '12.3', '100', '100.00', '12.350'])('takes %s', (value) => {
    expect(successFeeError(value)).toBe('')
  })

  it('takes an empty fee (no commission)', () => {
    expect(successFeeError('')).toBe('')
    expect(successFeeError('  ')).toBe('')
  })

  it.each(['0', '-1', '0.99', '101', '100.01', '-0'])('refuses %s as out of range', (value) => {
    expect(successFeeError(value)).toBe(SUCCESS_FEE_RANGE_MESSAGE)
  })

  it.each(['12.345', '1.001', '99.999'])('refuses %s for its third decimal', (value) => {
    expect(successFeeError(value)).toBe(SUCCESS_FEE_DECIMALS_MESSAGE)
  })

  it('refuses something that is not a number as out of range', () => {
    expect(successFeeError('abc')).toBe(SUCCESS_FEE_RANGE_MESSAGE)
  })
})
