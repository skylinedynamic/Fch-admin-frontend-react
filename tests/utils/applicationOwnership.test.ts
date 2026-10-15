import { describe, expect, it } from 'vitest'
import { ownsApplication } from '../../src/utils/applicationOwnership'

// Only the partner a funding application belongs to may edit it. The host
// reads every partner's applications but edits only its own borrowers'.
const host = { partner_id: 1, is_host: true }

describe('ownsApplication', () => {
  it('is true for the partner the application belongs to', () => {
    expect(ownsApplication({ partner_id: 7 }, 7)).toBe(true)
  })

  it('is false for the host looking at another partner\'s application', () => {
    expect(ownsApplication(host, 7)).toBe(false)
  })

  it('is true for the host on its own borrower\'s application', () => {
    expect(ownsApplication(host, 1)).toBe(true)
  })

  it('treats a numeric string and a number as the same partner', () => {
    expect(ownsApplication({ partner_id: '7' }, 7)).toBe(true)
    expect(ownsApplication({ partner_id: 7 }, '7')).toBe(true)
  })

  it.each([
    [null, 7],
    [{ partner_id: null }, 7],
    [{ partner_id: 7 }, null],
    [{ partner_id: 7 }, undefined],
    [undefined, undefined],
  ])('is false when either side has no partner (%o, %o)', (user, partnerId) => {
    expect(ownsApplication(user, partnerId)).toBe(false)
  })
})
