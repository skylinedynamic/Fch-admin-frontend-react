import { useState, type ChangeEvent, type FormEvent } from 'react'
import type { UpdatePasswordData as ChangePasswordPayload } from '../../../modules/auth-profile'

type Field = keyof ChangePasswordPayload
export type SetPasswordErrors = Partial<Record<Field, string>>

const MIN_LENGTH = 8

const EMPTY: ChangePasswordPayload = {
  current_password: '',
  new_password: '',
  new_password_confirmation: '',
}

const FIELDS: { name: Field; label: string; placeholder: string; autoComplete: string }[] = [
  { name: 'current_password', label: 'Temporary Password', placeholder: 'Enter temporary password', autoComplete: 'current-password' },
  { name: 'new_password', label: 'New Password', placeholder: 'Enter new password', autoComplete: 'new-password' },
  { name: 'new_password_confirmation', label: 'Confirm New Password', placeholder: 'Confirm new password', autoComplete: 'new-password' },
]

/**
 * The rules the server checks (UpdatePasswordRequest: Password::min()->mixedCase()
 * ->numbers()->symbols()), each ticked as the new password meets it.
 */
export const PASSWORD_REQUIREMENTS: { label: string; met: (password: string) => boolean }[] = [
  { label: `Minimum ${MIN_LENGTH} characters long`, met: (p) => p.length >= MIN_LENGTH },
  { label: 'Include uppercase and lowercase letters', met: (p) => /[a-z]/.test(p) && /[A-Z]/.test(p) },
  { label: 'Include at least one number', met: (p) => /\d/.test(p) },
  { label: 'Include at least one special character', met: (p) => /[^A-Za-z0-9\s]/.test(p) },
]

/** Checks the form before it is sent; the server checks the password rules. */
export function validateSetPassword(values: ChangePasswordPayload): SetPasswordErrors {
  const errors: SetPasswordErrors = {}
  if (!values.current_password) errors.current_password = 'Temporary password is required'
  if (!values.new_password) errors.new_password = 'New password is required'
  else if (values.new_password.length < MIN_LENGTH) errors.new_password = `Password must be at least ${MIN_LENGTH} characters`
  if (!values.new_password_confirmation) errors.new_password_confirmation = 'Please confirm your new password'
  else if (values.new_password !== values.new_password_confirmation) errors.new_password_confirmation = 'Passwords do not match'
  return errors
}

type Props = {
  submitting: boolean
  serverErrors: SetPasswordErrors
  onSubmit: (values: ChangePasswordPayload) => void
}

/** The password fields, laid out like the sign-in form's (eye toggle included). */
export default function SetPasswordForm({ submitting, serverErrors, onSubmit }: Props) {
  const [values, setValues] = useState<ChangePasswordPayload>(EMPTY)
  const [errors, setErrors] = useState<SetPasswordErrors>({})
  const [visible, setVisible] = useState<Partial<Record<Field, boolean>>>({})
  const shown: SetPasswordErrors = { ...serverErrors, ...errors }

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const name = e.target.name as Field
    setValues((prev) => ({ ...prev, [name]: e.target.value }))
    setErrors((prev) => ({ ...prev, [name]: undefined }))
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const found = validateSetPassword(values)
    setErrors(found)
    if (Object.keys(found).length === 0) onSubmit(values)
  }

  const renderField = (field: (typeof FIELDS)[number]) => (
    <>
      <label htmlFor={field.name} className="form-label fw-semibold">
        {field.label} <span className="text-danger">*</span>
      </label>
      <div className="position-relative auth-pass-inputgroup">
        <input
          type={visible[field.name] ? 'text' : 'password'}
          id={field.name}
          name={field.name}
          className={`form-control pe-5 password-input ${shown[field.name] ? 'is-invalid' : ''}`}
          value={values[field.name]}
          onChange={handleChange}
          placeholder={field.placeholder}
          autoComplete={field.autoComplete}
          disabled={submitting}
        />
        <button
          type="button"
          className="btn btn-link position-absolute end-0 top-0 text-decoration-none text-muted password-addon"
          onClick={() => setVisible((prev) => ({ ...prev, [field.name]: !prev[field.name] }))}
          aria-label="Toggle password visibility"
        >
          <i className="ri-eye-fill align-middle"></i>
        </button>
        {shown[field.name] && <div className="invalid-feedback">{shown[field.name]}</div>}
      </div>
    </>
  )

  const [current, next, confirm] = FIELDS

  // Laid out like Profile > Change Password: the current password on its own
  // row, the new one and its confirmation side by side, the rules in a card.
  return (
    <form className="needs-validation" noValidate onSubmit={handleSubmit}>
      <div className="mb-3">{renderField(current)}</div>

      <div className="row gy-3 mx-0">
        <div className="col-md-6 px-0 pe-md-2">{renderField(next)}</div>
        <div className="col-md-6 px-0 ps-md-2">{renderField(confirm)}</div>
      </div>

      {/* Not a .card: the theme's .card drops the border this box needs. */}
      <div className="password-requirements border rounded bg-light bg-opacity-50 mt-3 py-2 px-3">
        <div>
          <h6 className="fs-13 fw-semibold mb-2">Password Requirements</h6>
          <ul className="list-unstyled mb-0 vstack gap-1 fs-13">
            {PASSWORD_REQUIREMENTS.map((requirement) => {
              const met = requirement.met(values.new_password)
              return (
                <li key={requirement.label} data-met={met} className={`d-flex align-items-center ${met ? 'text-success' : 'text-muted'}`}>
                  <i
                    className={`${met ? 'ri-checkbox-circle-fill text-success' : 'ri-checkbox-blank-circle-line text-muted'} fs-16 me-2`}
                    aria-hidden="true"
                  ></i>
                  {requirement.label}
                </li>
              )
            })}
          </ul>
        </div>
      </div>

      <div className="mt-3">
        <button type="submit" className="btn btn-success w-100" disabled={submitting}>
          {submitting ? 'Saving...' : 'Set Password'}
        </button>
      </div>
    </form>
  )
}
