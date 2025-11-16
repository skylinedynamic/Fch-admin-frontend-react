import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { login } from '../../lib/auth'
import Auth from '../../components/Layout/Auth'

export default function SignIn() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [emailError, setEmailError] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [formError, setFormError] = useState('')
  const [remember, setRemember] = useState(false)

 const handleSubmit = async (e) => {
  e.preventDefault()
  setEmailError('')
  setPasswordError('')
  setFormError('')
  setLoading(true)

  try {
    // Call centralized auth service; rely on Laravel validation
    await login(email, password, remember)
    navigate('/')
  } catch (err) {
    const data = err?.response?.data

    if (data) {
      // Laravel validation format: { status:false, message, errors: { email: string|array, password: string|array } }
      const errors = data?.errors
      if (errors) {
        const emailMsg = Array.isArray(errors.email) ? errors.email?.[0] : errors.email
        const passwordMsg = Array.isArray(errors.password) ? errors.password?.[0] : errors.password
        if (emailMsg) setEmailError(emailMsg)
        if (passwordMsg) setPasswordError(passwordMsg)
        setFormError(data?.message ?? '')
      } else {
        // Fallback to field/message format if API returns a different shape
        if (data?.field === 'email') setEmailError(data?.message ?? '')
        if (data?.field === 'password') setPasswordError(data?.message ?? '')
        setFormError(data?.message ?? 'Unable to sign in.')
      }
    } else {
      setFormError('Network error, please try again.')
    }
  } finally {
    setLoading(false)
  }
}


  return (
    <Auth
      header={(
        <div className="text-center mt-2">
          <h5 className="text-primary">Sign In</h5>
          <p className="text-muted">Access your account</p>
        </div>
      )}
      colClass="col-md-8 col-lg-6 col-xl-5"
    >
      <div className="p-2 mt-4">
        <form className="needs-validation" noValidate onSubmit={handleSubmit}>
          <div className="mb-3">
            <label htmlFor="useremail" className="form-label">Email <span className="text-danger">*</span></label>
            <input
              value={email}
              onChange={(e)=>setEmail(e.target.value)}
              type="email"
              className={`form-control ${emailError ? 'is-invalid' : ''}`}
              id="useremail"
              placeholder="Enter email address"
              required
            />
            <div className="invalid-feedback">
              {emailError || 'Please enter email'}
            </div>
          </div>

          <div className="mb-3">
            <div className="float-end">
              <Link className="text-muted" to="/forgot-password">Forgot password?</Link>
            </div>

            <label className="form-label" htmlFor="password-input">Password</label>
            <div className="position-relative auth-pass-inputgroup">
              <input
                value={password}
                onChange={(e)=>setPassword(e.target.value)}
                type={showPassword ? 'text' : 'password'}
                className={`form-control pe-5 password-input ${passwordError ? 'is-invalid' : ''}`}
                placeholder="Enter password"
                id="password-input"
                required
              />
              <button
                className="btn btn-link position-absolute end-0 top-0 text-decoration-none text-muted password-addon"
                type="button"
                onClick={()=>setShowPassword(s=>!s)}
                aria-label="Toggle password visibility"
              >
                <i className="ri-eye-fill align-middle"></i>
              </button>
              <div className="invalid-feedback">{passwordError || 'Please enter password'}</div>
            </div>
          </div>

          <div className="block mt-4">
              <label className="flex items-center">
                <input
                    type="checkbox"
                    className="form-check-input"
                    id="rememberMe"
                    checked={remember}
                    onChange={(e)=>setRemember(e.target.checked)}
                />
                <label htmlFor="auth-remember-check" className="form-check-label">
                  <span className="ms-2">Remember me</span>
                </label>
              </label>
          </div>
          <div className="mt-4">
            <button className="btn btn-success w-100" type="submit" disabled={loading}>{loading ? 'Signing in...' : 'Sign In'}</button>
          </div>
        </form>
      </div>
    </Auth>
  )
}