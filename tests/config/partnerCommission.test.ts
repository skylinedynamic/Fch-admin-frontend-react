import { describe, expect, it } from 'vitest'
import { PARTNER_COMMISSION_TAB, partnerCommissionPath } from '../../src/config/partnerCommission'

describe('partnerCommissionPath', () => {
  it("opens the partner's profile on its Commissions tab", () => {
    expect(partnerCommissionPath(7)).toBe(`/partners/7?tab=${PARTNER_COMMISSION_TAB}`)
    expect(partnerCommissionPath(7)).toBe('/partners/7?tab=commissions')
  })
})
