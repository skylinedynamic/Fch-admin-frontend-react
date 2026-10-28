import { describe, expect, it } from 'vitest'
import { FUNDING_APPLICATION_STATUS_OPTIONS, FUNDING_APPLICATION_STATUS_CLASS_MAP } from '../../src/config/borrower'

/** SCRUM-331: the Funding Application status dropdown, exactly in this order. */
const EXPECTED = [
  'Draft',
  'Submitted – Pending Review',
  'Submitted (Received)',
  'Missing Documents (Action Required)',
  'Pending Clarification',
  'On Hold',
  'In Verification',
  'Underwriting Review',
  'Ready for Submission',
  'Matched to Lender',
  'Submitted to Lender',
  'Lender Reviewing',
  'Approved (Conditional)',
  'Approved (Final)',
  'Offer Issued',
  'Offer Accepted',
  'Contracting / Docs Out',
  'Cleared to Fund',
  'Funded',
  'Closed (Completed)',
  'Denied',
  'Withdrawn',
  'Offer Declined by Borrower',
  'Closed - No Response',
  'Closed - Incomplete Application',
  'Closed - Error',
]

describe('funding application status dropdown', () => {
  it('lists every status in the agreed order, label and value the same', () => {
    expect(FUNDING_APPLICATION_STATUS_OPTIONS.map((o) => o.label)).toEqual(EXPECTED)
    expect(FUNDING_APPLICATION_STATUS_OPTIONS.map((o) => o.value)).toEqual(EXPECTED)
  })

  it('gives every status a badge, Withdrawn and Denied their own', () => {
    for (const status of EXPECTED) expect(FUNDING_APPLICATION_STATUS_CLASS_MAP[status]).toBeTruthy()
    expect(FUNDING_APPLICATION_STATUS_CLASS_MAP.Withdrawn).toBe('bg-secondary-subtle text-secondary')
    expect(FUNDING_APPLICATION_STATUS_CLASS_MAP.Denied).toBe('bg-danger-subtle text-danger')
  })
})
