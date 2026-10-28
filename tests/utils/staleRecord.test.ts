import { describe, expect, it } from 'vitest'
import { isStaleRecordError, staleRecordMessage, withExpectedStatus } from '../../src/utils/staleRecord'

// R2 BUG-041 / 045 / 058 / 079: a save or decision made from a page showing an
// older copy of the record is refused by the API with 409.
describe('stale record responses', () => {
  const conflict = { response: { status: 409, data: { message: 'This request is already "Approved" - it was changed by someone else since you opened it. Reload to see the latest.' } } }

  it('recognises the 409 the API answers with', () => {
    expect(isStaleRecordError(conflict)).toBe(true)
    expect(isStaleRecordError({ response: { status: 422 } })).toBe(false)
    expect(isStaleRecordError(undefined)).toBe(false)
  })

  it("shows the API's message, or a plain fallback", () => {
    expect(staleRecordMessage(conflict)).toMatch(/already "Approved"/)
    expect(staleRecordMessage({ response: { status: 409, data: {} } })).toBe(
      'This record was changed by someone else since you opened it. Reload to see the latest.'
    )
  })

  it('sends the status the page was showing with a status change', () => {
    expect(withExpectedStatus({ id: 48, status: 'Rejected', reject_reason: 'No' }, 'Pending')).toEqual({
      id: 48,
      status: 'Rejected',
      reject_reason: 'No',
      expected_status: 'Pending',
    })
    // Nothing loaded yet: no check is asked for.
    expect(withExpectedStatus({ id: 48, status: 'Approved' }, undefined)).toEqual({ id: 48, status: 'Approved' })
  })
})
