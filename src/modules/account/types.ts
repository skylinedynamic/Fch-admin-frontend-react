/** Result of resending or cancelling a pending sign-in email change. */
export type PendingEmailChange = {
  pending_email: string | null
}

/** The three links an email change sends: confirm (new address), cancel and undo (old address). */
export const EMAIL_CHANGE_ACTIONS = ['confirm', 'cancel', 'undo'] as const
export type EmailChangeAction = typeof EMAIL_CHANGE_ACTIONS[number]

export const isEmailChangeAction = (value: string | undefined): value is EmailChangeAction =>
  (EMAIL_CHANGE_ACTIONS as readonly string[]).includes(value ?? '')

/** A link as it arrived: the path parts and its query (expires + signature), kept verbatim. */
export type EmailChangeLinkParams = {
  action: EmailChangeAction
  user: string
  hash: string
  query: string
}

/** `ready` until the link is acted on; then what happened. */
export type EmailChangeLinkState =
  | 'ready'
  | 'changed'
  | 'cancelled'
  | 'reverted'
  | 'invalid'
  | 'taken'
  | 'too_many_attempts'
  | 'wrong_password'

/** What the API says about a link, with the wording to show. */
export type EmailChangeLink = {
  action: EmailChangeAction
  state: EmailChangeLinkState
  title: string
  message: string
  tone: 'info' | 'success' | 'warning' | 'danger'
  button: string | null
  needs_password: boolean
  login_url: string | null
}
