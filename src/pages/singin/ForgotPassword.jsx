import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { forgotPassword } from '../../lib/auth'
import Auth from '../../components/Layout/Auth'

export default function ForgotPassword() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)
    try {
      const res = await forgotPassword(email)
      const message = res?.message || 'If the email exists, a reset link has been sent.'
      setSuccess(message)
    } catch (err) {
      const data = err?.response?.data
      if (data?.errors?.email) {
        const emailMsg = Array.isArray(data.errors.email) ? data.errors.email[0] : data.errors.email
        setError(emailMsg || data?.message || 'Unable to process request.')
      } else {
        setError(data?.message || 'Unable to process request.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Auth
      header={(
        <div className="text-center mt-2">
          <h5 className="text-primary">Forgot Password?</h5>
          <p className="text-muted">Reset password with Four Corner Holdings</p>
          <i className="ri-mail-send-line display-5 text-success mb-3"></i>
        </div>
      )}
      colClass="col-xl-5 col-lg-6 col-md-8"
    >
      {!success && (
        <div role="alert" className="alert alert-warning border-0 text-center mb-2 fade show">
          Enter your email and instructions will be sent to you!
        </div>
      )}

      {success && (
        <div role="alert" className="alert alert-success border-0 text-center mb-2 fade show">
          {success}
        </div>
      )}

      <form noValidate onSubmit={handleSubmit}>
        <label className="form-label" htmlFor="email"> Email </label>
        <span className="text-danger ms-1">*</span>
        <input
          name="email"
          placeholder="Enter Email"
          required
          type="email"
          id="email"
          className={`mt-1 form-control ${error ? 'is-invalid' : ''}`}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <div className="mt-2 d-block invalid-feedback">{error || ''}</div>
        <div className="flex items-center justify-end mt-4">
          <button type="submit" className="btn btn-success w-100" disabled={loading}>
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </div>
      </form>

      <div className="mt-4 text-center">
        <p className="mb-0">
          Wait, I remember my password...{' '}
          <Link className="fw-semibold text-primary text-decoration-underline" to="/login">
            Click here
          </Link>
        </p>
      </div>
    </Auth>
  )
}