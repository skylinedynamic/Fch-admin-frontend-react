import { apiClient } from '../../lib/http/apiClient'
import type { EmailChangeLink, EmailChangeLinkParams, PendingEmailChange } from './types'

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

/**
 * An email-change link opens on the portal. Its page reads and acts on the
 * link at the API endpoint with the same path, passing the link's query
 * (expires + signature) along exactly as it came: the API checks the signature
 * against it.
 */
const emailChangeLinkPath = ({ action, user, hash, query }: EmailChangeLinkParams) =>
  `/email-change/${action}/${encodeURIComponent(user)}/${encodeURIComponent(hash)}${query}`

export const readEmailChangeLink = async (link: EmailChangeLinkParams): Promise<EmailChangeLink> => {
  const { data } = await apiClient.get(emailChangeLinkPath(link))
  return data.data
}

export const submitEmailChangeLink = async (link: EmailChangeLinkParams, password?: string): Promise<EmailChangeLink> => {
  const { data } = await apiClient.post(emailChangeLinkPath(link), password === undefined ? {} : { password })
  return data.data
}
