import { describe, expect, it } from 'vitest'
import {
  FUNDING_APPLICATION_STATUS_OPTIONS,
  FUNDING_APPLICATION_STATUS_CLASS_MAP,
  FUNDING_APPLICATION_STATUS_NOTE_MAX,
} from '../../src/config/borrower'

/**
 * SCRUM-331: stage's 19 statuses in their stage order, then the seven new ones.
 * The same order as the API (config/funding_application.php `statuses.order`).
 */
const EXPECTED = [
  'On Hold',
  'Draft',
  'Submitted – Pending Review',
  'Submitted (Received)',
  'Underwriting Review',
  'Missing Documents (Action Required)',
  'In Verification',
  'Approved (Conditional)',
  'Approved (Final)',
  'Matched to Lender',
  'Submitted to Lender',
  'Lender Reviewing',
  'Offer Issued',
  'Offer Accepted',
  'Contracting / Docs Out',
  'Cleared to Fund',
  'Funded',
  'Closed (Completed)',
  'Denied',
  'Pending Clarification',
  'Ready for Submission',
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
    expect(Object.keys(FUNDING_APPLICATION_STATUS_CLASS_MAP)).toHaveLength(EXPECTED.length)
    expect(FUNDING_APPLICATION_STATUS_CLASS_MAP.Withdrawn).toBe('bg-secondary-subtle text-secondary')
    expect(FUNDING_APPLICATION_STATUS_CLASS_MAP.Denied).toBe('bg-danger-subtle text-danger')
  })

  it('caps Status Notes at the 10,000 characters the API accepts', () => {
    expect(FUNDING_APPLICATION_STATUS_NOTE_MAX).toBe(10000)
  })
})
