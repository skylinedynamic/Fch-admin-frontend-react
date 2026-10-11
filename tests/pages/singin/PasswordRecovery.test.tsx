import { beforeEach, describe, expect, it } from 'vitest'
import userEvent from '@testing-library/user-event'
import { screen, waitFor } from '../../test-utils'
import { allowBackgroundCalls, api, renderPage, signOut } from '../pageHarness'
import ForgotPassword from '../../../src/pages/singin/ForgotPassword'
import ResetPassword from '../../../src/pages/singin/ResetPassword'

beforeEach(() => {
  signOut()
  allowBackgroundCalls()
})

describe('ForgotPassword', () => {
  const mount = () => renderPage(<ForgotPassword />, { path: '/forgot-password' })

  it('posts the email and shows the confirmation', async () => {
    const user = userEvent.setup()
    const forgot = api('post', '/auth/forgot', { status: true, message: 'Reset link sent to your email.' })
    mount()

    await user.type(screen.getByPlaceholderText('Enter Email'), 'host@example.test')
    await user.click(screen.getByRole('button', { name: 'Send Reset Link' }))

    await waitFor(() => expect(forgot.bodies[0]).toEqual({ email: 'host@example.test' }))
    expect(await screen.findByText('Reset link sent to your email.')).toBeInTheDocument()
  })

  it('falls back to a neutral message that does not confirm whether the account exists', async () => {
    const user = userEvent.setup()
    api('post', '/auth/forgot', { status: true })
    mount()

    await user.type(screen.getByPlaceholderText('Enter Email'), 'host@example.test')
    await user.click(screen.getByRole('button', { name: 'Send Reset Link' }))

    expect(await screen.findByText('If the email exists, a reset link has been sent.')).toBeInTheDocument()
  })

  it('shows the field error from the API', async () => {
    const user = userEvent.setup()
    api('post', '/auth/forgot', { status: false, message: 'Invalid', errors: { email: 'We cannot find a user with that email address.' } }, 422)
    mount()

    await user.type(screen.getByPlaceholderText('Enter Email'), 'nobody@example.test')
    await user.click(screen.getByRole('button', { name: 'Send Reset Link' }))

    expect(await screen.findByText('We cannot find a user with that email address.')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Enter Email')).toHaveClass('is-invalid')
  })

  it('shows the general message when there is no field error', async () => {
    const user = userEvent.setup()
    api('post', '/auth/forgot', { status: false, message: 'Too many attempts.' }, 429)
    mount()

    await user.click(screen.getByRole('button', { name: 'Send Reset Link' }))

    expect(await screen.findByText('Too many attempts.')).toBeInTheDocument()
  })
})

describe('ResetPassword', () => {
  const LINK = '/reset-password?token=abc&email=host@example.test'
  const mount = (route = LINK) => renderPage(<ResetPassword />, { path: '/reset-password', route })
  const fill = async (user: ReturnType<typeof userEvent.setup>, password: string, confirm = password) => {
    await user.type(screen.getByPlaceholderText('Enter password'), password)
    await user.type(screen.getByPlaceholderText('Confirm password'), confirm)
  }

  it('refuses a link with no token or email without calling the API', async () => {
    const user = userEvent.setup()
    const reset = api('post', '/auth/reset', { status: true })
    mount('/reset-password')

    await fill(user, 'Password1')
    await user.click(screen.getByRole('button', { name: 'Reset Password' }))

    expect(await screen.findByText(/Reset link is invalid or expired/)).toBeInTheDocument()
    expect(reset.calls).toBe(0)
  })

  it('ticks each password rule as it is met', async () => {
    const user = userEvent.setup()
    const { container } = mount()
    const met = () => container.querySelectorAll('#password-contain p.valid').length

    expect(met()).toBe(0)
    await user.type(screen.getByPlaceholderText('Enter password'), 'pass')
    expect(met()).toBe(1) // lowercase
    await user.type(screen.getByPlaceholderText('Enter password'), 'word')
    expect(met()).toBe(2) // + length
    await user.type(screen.getByPlaceholderText('Enter password'), 'A')
    expect(met()).toBe(3) // + uppercase
    await user.type(screen.getByPlaceholderText('Enter password'), '1')
    expect(met()).toBe(4) // + number
  })

  it('posts the token and email from the link with both passwords, then goes to login', async () => {
    const user = userEvent.setup()
    const reset = api('post', '/auth/reset', { status: true, message: 'Password reset.' })
    mount()

    await fill(user, 'Password1')
    await user.click(screen.getByRole('button', { name: 'Reset Password' }))

    await waitFor(() =>
      expect(reset.bodies[0]).toEqual({ token: 'abc', email: 'host@example.test', password: 'Password1', password_confirmation: 'Password1' })
    )
    expect(await screen.findByText('Password reset.')).toBeInTheDocument()
    expect(await screen.findByTestId('landing', {}, { timeout: 3000 })).toHaveTextContent('navigated:/login')
  })

  it('shows a mismatched confirmation under the confirm field', async () => {
    const user = userEvent.setup()
    api('post', '/auth/reset', { status: false, message: 'Invalid', errors: { password_confirmation: 'The password confirmation does not match.' } }, 422)
    mount()

    await fill(user, 'Password1', 'Different1')
    await user.click(screen.getByRole('button', { name: 'Reset Password' }))

    expect(await screen.findByText('The password confirmation does not match.')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Confirm password')).toHaveClass('is-invalid')
  })

  it('shows an expired-token error as a banner', async () => {
    const user = userEvent.setup()
    api('post', '/auth/reset', { status: false, message: 'This password reset token is invalid.' }, 400)
    mount()

    await fill(user, 'Password1')
    await user.click(screen.getByRole('button', { name: 'Reset Password' }))

    expect(await screen.findByText('This password reset token is invalid.')).toBeInTheDocument()
  })

  it('links back to login', () => {
    mount()

    expect(screen.getByRole('link', { name: /click here/i })).toHaveAttribute('href', '/login')
  })
})
