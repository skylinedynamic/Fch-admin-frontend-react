import React, { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { resetPassword } from '../../lib/auth'
import Auth from '../../components/Layout/Auth'

export default function ResetPassword() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const token = params.get('token') || ''
  const emailParam = params.get('email') || ''

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [remember, setRemember] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const rules = useMemo(() => {
    const hasLength = password.length >= 8
    const hasLower = /[a-z]/.test(password)
    const hasUpper = /[A-Z]/.test(password)
    const hasNumber = /[0-9]/.test(password)
    return { hasLength, hasLower, hasUpper, hasNumber }
  }, [password])

  const validate = () => {
    if (!token || !emailParam) {
      return 'Reset link is invalid or expired. Please use the link from your email.'
    }
    if (!rules.hasLength || !rules.hasLower || !rules.hasUpper || !rules.hasNumber) {
      return 'Password does not meet the requirements.'
    }
    if (password !== confirmPassword) {
      return 'Passwords do not match.'
    }
    return null
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    const validationMsg = validate()
    if (validationMsg) {
      setError(validationMsg)
      return
    }
    setLoading(true)
    try {
      const res = await resetPassword({
        token,
        email: emailParam,
        password,
        password_confirmation: confirmPassword,
      })
      const message = res?.message || 'Password has been reset successfully.'
      setSuccess(message)
      // Optional: navigate to login after a short delay
      // setTimeout(() => navigate('/login'), 1500)
    } catch (err) {
      const data = err?.response?.data
      const msg = data?.message || 'Unable to reset password.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Auth
      header={(
        <div className="text-center mt-2">
          <h5 className="text-primary">Create new password</h5>
           <i className="ri-folder-keyhole-line display-5 text-success mb-3"></i>
        </div>
      )}
      colClass="col-xl-5 col-lg-6 col-md-8"
    >
      {success && (
        <div role="alert" className="alert alert-success border-0 text-center mb-2 mx-2 fade show">
          {success}
        </div>
      )}
      {error && (
        <div role="alert" className="alert alert-danger border-0 text-center mb-2 mx-2 fade show">
          {error}
        </div>
      )}

      <div className="p-2">
        <form noValidate onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label" htmlFor="password-input">Password</label>
            <div className="position-relative auth-pass-inputgroup">
              <input
                placeholder="Enter password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                id="password-input"
                className="form-control pe-5 password-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button type="button" className="btn btn-link position-absolute end-0 top-0 text-decoration-none text-muted password-addon material-shadow-none" onClick={() => setShowPassword((s) => !s)}>
                <i className="ri-eye-fill align-middle"></i>
              </button>
            </div>
          </div>

          <div className="mb-3">
            <label className="form-label" htmlFor="confirm-password-input">Confirm Password</label>
            <div className="position-relative auth-pass-inputgroup mb-3">
              <input
                placeholder="Confirm password"
                name="confirm_password"
                type={showConfirm ? 'text' : 'password'}
                id="confirm-password-input"
                className="form-control pe-5 password-input"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
              <button type="button" className="btn btn-link position-absolute end-0 top-0 text-decoration-none text-muted password-addon material-shadow-none" onClick={() => setShowConfirm((s) => !s)}>
                <i className="ri-eye-fill align-middle"></i>
              </button>
            </div>
          </div>

          <div id="password-contain" className="p-3 bg-light mb-2 rounded">
            <h5 className="fs-13">Password must contain:</h5>
            <p className={`${rules.hasLength ? 'valid' : 'invalid'} fs-12 mb-2`}>Minimum <b>8 characters</b></p>
            <p className={`${rules.hasLower ? 'valid' : 'invalid'} fs-12 mb-2`}>At <b>lowercase</b> letter (a-z)</p>
            <p className={`${rules.hasUpper ? 'valid' : 'invalid'} fs-12 mb-2`}>At least <b>uppercase</b> letter (A-Z)</p>
            <p className={`${rules.hasNumber ? 'valid' : 'invalid'} fs-12 mb-0`}>A least <b>number</b> (0-9)</p>
          </div>

          <div className="form-check">
            <input type="checkbox" id="auth-remember-check" className="form-check-input" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
            <label htmlFor="auth-remember-check" className="form-check-label">Remember me</label>
          </div>

          <div className="mt-4">
            <button type="submit" className="btn btn-success w-100" disabled={loading}>
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </div>
        </form>
      </div>

      <div className="mt-4 text-center">
        <p className="mb-0">Wait, I remember my password...{' '}<Link className="fw-semibold text-primary text-decoration-underline" to="/login">Click here</Link></p>
      </div>
    </Auth>
  )
}