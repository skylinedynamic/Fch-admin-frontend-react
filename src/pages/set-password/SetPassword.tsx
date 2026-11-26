import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Auth from '../../components/Layout/Auth'
import { useAuthStore } from '../../store/auth'
import { useUpdatePassword, type UpdatePasswordData as ChangePasswordPayload } from '../../modules/auth-profile'
import { logout } from '../../lib/auth/authApi'
import { clearAuth, markPasswordChanged } from '../../lib/auth/auth'
import { PORTAL_HOME_ROUTE } from '../../config/passwordChange'
import SetPasswordForm, { type SetPasswordErrors } from './components/SetPasswordForm'

/** Laravel's { field: [message] } as one message per field. */
function firstErrors(errors: Record<string, string[] | string> | undefined): SetPasswordErrors {
  const out: SetPasswordErrors = {}
  Object.entries(errors ?? {}).forEach(([field, messages]) => {
    out[field as keyof SetPasswordErrors] = Array.isArray(messages) ? messages[0] : messages
  })
  return out
}

/**
 * Shown, alone, after signing in with a password someone else issued: the
 * user chooses their own before anything else, or signs out. The form is laid
 * out like Profile > Change Password. Reached through ForcePasswordRoute; ProtectedRoute and
 * apiClient send such a user here.
 */
export default function SetPassword() {
  const navigate = useNavigate()
  const { mutateAsync: updatePassword, isPending } = useUpdatePassword()
  const [serverErrors, setServerErrors] = useState<SetPasswordErrors>({})
  const [formError, setFormError] = useState('')
  const firstName = useAuthStore((state) => String(state.user?.name ?? '').trim().split(/\s+/)[0])
  const greeting = firstName
    ? `Hi ${firstName}, you signed in with a temporary password. Choose your own to continue.`
    : 'You signed in with a temporary password. Choose your own to continue.'

  const handleSubmit = async (values: ChangePasswordPayload) => {
    setServerErrors({})
    setFormError('')
    try {
      await updatePassword(values)
      markPasswordChanged()
      navigate(PORTAL_HOME_ROUTE, { replace: true })
    } catch (error) {
      const data = (error as { response?: { data?: { errors?: Record<string, string[]>; message?: string } } })?.response?.data
      if (data?.errors) setServerErrors(firstErrors(data.errors))
      else setFormError(data?.message ?? 'Unable to update your password. Please try again.')
    }
  }

  const handleLogout = async () => {
    try {
      await logout()
    } catch {
      // Signed out locally either way.
    } finally {
      clearAuth()
      navigate('/login', { replace: true })
    }
  }

  return (
    <Auth
      header={(
        <div className="text-center">
          <h5 className="text-primary fw-semibold mb-1">Set Your New Password</h5>
          <p className="text-muted mb-0">{greeting}</p>
        </div>
      )}
      belowCard={null}
      colClass="col-xxl-6 col-xl-7 col-lg-8 col-md-10"
    >
      <div className="px-2 mt-3">
        <SetPasswordForm submitting={isPending} serverErrors={serverErrors} onSubmit={handleSubmit} />

        {formError && (
          <div className="alert alert-danger text-center mt-3 mb-0" role="alert">{formError}</div>
        )}

        <div className="mt-3 text-center">
          <button type="button" className="btn btn-link text-muted text-decoration-none p-0" onClick={handleLogout} disabled={isPending}>
            <i className="ri-logout-box-r-line align-bottom me-1" aria-hidden="true"></i>
            Log Out
          </button>
        </div>
      </div>
    </Auth>
  )
}
