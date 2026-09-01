import { describe, expect, it } from 'vitest'
import { computeIsApplicationSubmitted } from '../../../../src/pages/applications/fundapplication/FundApplication'
import { FUNDING_APPLICATION_STATUS } from '../../../../src/config/borrower'

describe('computeIsApplicationSubmitted', () => {
  it(
    'REGRESSION: isApplicationSubmitted was accidentally dropped in a refactor (recovered in ' +
      'commit 48e8e7c) — this pins the restored behavior so it cannot silently disappear again',
    () => {
      expect(computeIsApplicationSubmitted(undefined)).toBe(false)
      expect(computeIsApplicationSubmitted(null)).toBe(false)
      expect(computeIsApplicationSubmitted(FUNDING_APPLICATION_STATUS.DRAFT)).toBe(false)
      expect(computeIsApplicationSubmitted(FUNDING_APPLICATION_STATUS.ON_HOLD)).toBe(false)
      expect(computeIsApplicationSubmitted(FUNDING_APPLICATION_STATUS.SUBMITTED)).toBe(true)
      expect(computeIsApplicationSubmitted(FUNDING_APPLICATION_STATUS.APPROVED_FINAL)).toBe(true)
      expect(computeIsApplicationSubmitted(FUNDING_APPLICATION_STATUS.FUNDED)).toBe(true)
    }
  )
})
