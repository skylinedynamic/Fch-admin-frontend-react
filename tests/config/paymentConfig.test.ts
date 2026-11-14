import { describe, expect, it } from 'vitest'
import { PAYMENT_METHOD_OPTIONS } from '../../src/config/paymentConfig'
import { COMMISSION_PAYMENT } from '../../src/config/statusOptions'

/**
 * A commission payout is recorded with the method picked in the payout dialog
 * (COMMISSION_PAYMENT: Cash, Cheque, ...), so the Payments Method filter must
 * offer those too - otherwise a commission payment can never be filtered.
 */
describe('PAYMENT_METHOD_OPTIONS', () => {
  const values = PAYMENT_METHOD_OPTIONS.map((o) => o.value)

  it('offers every commission payout method', () => {
    for (const { value } of COMMISSION_PAYMENT) {
      expect(values).toContain(value)
    }
  })

  it('keeps the gateway methods and "All Methods" first', () => {
    expect(PAYMENT_METHOD_OPTIONS[0]).toEqual({ label: 'All Methods', value: null })
    for (const gateway of ['Stripe', 'Bank Transfer', 'Square', 'Ecrypt', 'Authorize.Net', 'Cash Payment']) {
      expect(values).toContain(gateway)
    }
  })

  it('lists each method once', () => {
    expect(new Set(values).size).toBe(values.length)
  })
})
