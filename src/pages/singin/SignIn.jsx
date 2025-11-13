import React, { useState } from 'react'
import logoImg from '../../../assets/images/logo.png'
import { useNavigate } from 'react-router-dom'
import { login } from '../../lib/authApi'

export default function SignIn() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [emailError, setEmailError] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [formError, setFormError] = useState('')
  const [remember, setRemember] = useState(true)

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
    <div className="auth-page-wrapper pt-5">
      {/* auth page bg */}
      <div className="auth-one-bg-position auth-one-bg" id="auth-particles">
        <div className="bg-overlay"></div>
        <div className="shape">
          <svg xmlns="http://www.w3.org/2000/svg" version="1.1" xmlnsXlink="http://www.w3.org/1999/xlink" viewBox="0 0 1440 120">
            <path d="M 0,36 C 144,53.6 432,123.2 720,124 C 1008,124.8 1296,56.8 1440,40L1440 140L0 140z"></path>
          </svg>
        </div>
      </div>

      {/* auth page content */}
      <div className="auth-page-content">
        <div className="container">
          <div className="row">
            <div className="col-lg-12">
              <div className="text-center mt-sm-5 mb-4 text-white-50">
                <div>
                  <a href="/" className="d-inline-block auth-logo">
                    {/* Use FourCorner logo while keeping design markup */}
                    <img src={logoImg} alt="FourCorner" height="40" />
                  </a>
                </div>
              </div>
            </div>
          </div>
          {/* end row */}

          <div className="row justify-content-center">
            <div className="col-md-8 col-lg-6 col-xl-5">
              <div className="card mt-4">
                <div className="card-body p-4">
                  <div className="text-center mt-2">
                    <h5 className="text-primary">Sign In</h5>
                    <p className="text-muted">Access your account</p>
                  </div>
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
                        <div className="float-end"><a className="text-muted" href="/forgot-password">Forgot password?</a></div>

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
                </div>
                {/* end card body */}
              </div>
              {/* end card */}


            </div>
          </div>
          {/* end row */}
        </div>
        {/* end container */}
      </div>
      {/* end auth page content */}

      {/* footer */}
      <footer className="footer">
        <div className="container">
          <div className="row">
            <div className="col-lg-12">
              <div className="text-center">
                <p className="mb-0 text-muted">&copy; {new Date().getFullYear()} Four Corner Holding. All rights reserved.</p>
              </div>
            </div>
          </div>
        </div>
      </footer>
      {/* end Footer */}
    </div>
  )
}