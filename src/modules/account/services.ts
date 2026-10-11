import { apiClient } from '../../lib/http/apiClient'
import type { PendingEmailChange } from './types'

/**
 * A new sign-in email isn't applied when an edit form is saved: it waits as
 * `pending_email` on the login until the link emailed to the new address is
 * clicked. These act on that pending change.
 */
export const resendEmailChange = async (userId: string | number): Promise<PendingEmailChange> => {
  const { data } = await apiClient.post('/common/email-change/resend', { user_id: Number(userId) })
  return data.data
}

export const cancelEmailChange = async (userId: string | number): Promise<PendingEmailChange> => {
  const { data } = await apiClient.post('/common/email-change/cancel', { user_id: Number(userId) })
  return data.data
}
