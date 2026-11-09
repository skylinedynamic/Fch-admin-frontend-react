import { describe, expect, it } from 'vitest'
import { initialEmailRecipient } from '../../src/utils/emailRecipient'
import {
  ENTITY_TYPE_FUNDING_REQUEST, ENTITY_TYPE_PARTNER,
  TARGET_RECIPIENT_BORROWER, TARGET_RECIPIENT_HOST,
} from '../../src/config/appConfig'
import { FCH_SUPPORT_EMAIL } from '../../src/config/appConfig'

// Who New Email is addressed to when it opens, from the activity context the
// sidebar sets.
describe('initialEmailRecipient', () => {
  it("a host on a client's activity: the client's email (it was left empty)", () => {
    expect(initialEmailRecipient({ entityType: 'Client', isHost: true, borrowerEmail: 'client@example.test' }))
      .toEqual({ email: 'client@example.test', target: TARGET_RECIPIENT_BORROWER })
  })

  it("a host with a partner's email in the context: the partner's email, to FCH", () => {
    expect(initialEmailRecipient({ entityType: 'Client', isHost: true, partnerEmail: 'partner@example.test', borrowerEmail: 'client@example.test' }))
      .toEqual({ email: 'partner@example.test', target: TARGET_RECIPIENT_HOST })
  })

  it("a partner on a client's activity: the client's email", () => {
    expect(initialEmailRecipient({ entityType: 'Client', isHost: false, borrowerEmail: 'client@example.test' }))
      .toEqual({ email: 'client@example.test', target: TARGET_RECIPIENT_BORROWER })
  })

  it('a partner with no client email in the context: the host, to FCH', () => {
    expect(initialEmailRecipient({ entityType: 'Client', isHost: false, hostEmail: 'host@example.test' }))
      .toEqual({ email: 'host@example.test', target: TARGET_RECIPIENT_HOST })
  })

  it("a funding request: the borrower's email", () => {
    expect(initialEmailRecipient({ entityType: ENTITY_TYPE_FUNDING_REQUEST, isHost: true, partnerEmail: 'p@example.test', borrowerEmail: 'b@example.test' }))
      .toEqual({ email: 'b@example.test', target: TARGET_RECIPIENT_BORROWER })
  })

  it("a partner's own activity: its email, or FCH support when it has none in the context", () => {
    expect(initialEmailRecipient({ entityType: ENTITY_TYPE_PARTNER, partnerEmail: 'p@example.test' }).email).toBe('p@example.test')
    expect(initialEmailRecipient({ entityType: ENTITY_TYPE_PARTNER }).email).toBe(FCH_SUPPORT_EMAIL)
  })

  it('a host with no email in the context at all: nothing', () => {
    expect(initialEmailRecipient({ entityType: 'Client', isHost: true }).email).toBe('')
  })
})
