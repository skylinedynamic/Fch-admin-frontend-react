/**
 * The forced password change: a login signed in with a password someone else
 * issued (generated and emailed, or typed in by an admin) sees only this
 * screen until they choose their own. fch-api marks such a user with
 * `must_change_password` and answers any other call with 403 and this code
 * (EnsurePasswordChanged).
 */
export const FORCE_PASSWORD_ROUTE = '/set-password'

export const PASSWORD_CHANGE_REQUIRED_CODE = 'password_change_required'

/** Where the portal opens once the password is chosen (and for anyone with nothing to change). */
export const PORTAL_HOME_ROUTE = '/'
