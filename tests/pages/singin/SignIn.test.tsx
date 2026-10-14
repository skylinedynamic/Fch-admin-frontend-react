import { beforeEach, describe, expect, it } from 'vitest'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '../../mocks/server'
import { screen, waitFor } from '../../test-utils'
import { allowBackgroundCalls, api, renderPage, signOut } from '../pageHarness'
import { useAuthStore } from '../../../src/store/auth'
import SignIn from '../../../src/pages/singin/SignIn'

const LOGIN = '/auth/login'
const mount = () => renderPage(<SignIn />, { path: '/login' })

const fillAndSubmit = async (user: ReturnType<typeof userEvent.setup>, email = 'host@example.test', password = 'Password1') => {
  await user.type(screen.getByPlaceholderText('Enter email address'), email)
  await user.type(screen.getByPlaceholderText('Enter password'), password)
  await user.click(screen.getByRole('button', { name: 'Sign In' }))
}

beforeEach(() => {
  signOut()
  allowBackgroundCalls()
})

describe('SignIn', () => {
  it('starts empty with a link to forgot password', () => {
    mount()

    expect(screen.getByPlaceholderText('Enter email address')).toHaveValue('')
    expect(screen.getByPlaceholderText('Enter password')).toHaveValue('')
    expect(screen.getByRole('link', { name: /forgot password/i })).toHaveAttribute('href', '/forgot-password')
  })

  it('toggles the password between hidden and visible', async () => {
    const user = userEvent.setup()
    mount()
    const password = screen.getByPlaceholderText('Enter password')
    const toggle = screen.getByRole('button', { name: /toggle password visibility/i })

    expect(password).toHaveAttribute('type', 'password')
    await user.click(toggle)
    expect(password).toHaveAttribute('type', 'text')
    await user.click(toggle)
    expect(password).toHaveAttribute('type', 'password')
  })

  it('posts the credentials, stores the session and leaves the login page', async () => {
    const user = userEvent.setup()
    const login = api('post', LOGIN, {
      status: true,
      data: { token: 'tok-123', user: { id: 1, name: 'Host Admin', is_host: 1, permissions: ['view clients'] } },
    })
    mount()

    await fillAndSubmit(user)

    await waitFor(() => expect(login.bodies[0]).toEqual({ email: 'host@example.test', password: 'Password1', remember: false }))
    expect(await screen.findByTestId('landing')).toHaveTextContent('navigated:/')
    expect(useAuthStore.getState().token).toBe('tok-123')
    expect(useAuthStore.getState().user).toMatchObject({ name: 'Host Admin' })
  })

  it('sends remember=true when the box is ticked', async () => {
    const user = userEvent.setup()
    const login = api('post', LOGIN, { status: true, data: { token: 't', user: { id: 1, permissions: [] } } })
    const { container } = mount()

    await user.click(container.querySelector('#rememberMe')!)
    await fillAndSubmit(user)

    await waitFor(() => expect(login.bodies[0]).toMatchObject({ remember: true }))
  })

  it('shows field errors returned by the API and stays signed out', async () => {
    const user = userEvent.setup()
    api('post', LOGIN, { status: false, message: 'Invalid', errors: { email: 'The email field is required.', password: 'The password field is required.' } }, 422)
    mount()

    await user.click(screen.getByRole('button', { name: 'Sign In' }))

    expect(await screen.findByText('The email field is required.')).toBeInTheDocument()
    expect(screen.getByText('The password field is required.')).toBeInTheDocument()
    expect(useAuthStore.getState().token).toBeFalsy()
  })

  it('also accepts Laravel-style array errors', async () => {
    const user = userEvent.setup()
    api('post', LOGIN, { message: 'Invalid', errors: { email: ['These credentials do not match our records.'] } }, 422)
    mount()

    await fillAndSubmit(user)

    expect(await screen.findByText('These credentials do not match our records.')).toBeInTheDocument()
  })

  it('shows a general failure message when no field is to blame', async () => {
    const user = userEvent.setup()
    api('post', LOGIN, { status: false, message: 'Invalid credentials.' }, 401)
    mount()

    await fillAndSubmit(user, 'host@example.test', 'wrong')

    expect(await screen.findByText('Invalid credentials.')).toBeInTheDocument()
  })

  it('treats a 200 with status:false as a failed login', async () => {
    const user = userEvent.setup()
    api('post', LOGIN, { status: false, message: 'Account is locked.' })
    mount()

    await fillAndSubmit(user)

    expect(await screen.findByText('Account is locked.')).toBeInTheDocument()
    expect(useAuthStore.getState().token).toBeFalsy()
  })

  it('rejects a success response that carries no token', async () => {
    const user = userEvent.setup()
    api('post', LOGIN, { status: true, message: 'ok', data: { user: { id: 1 } } })
    mount()

    await fillAndSubmit(user)

    await waitFor(() => expect(screen.getByRole('button', { name: 'Sign In' })).toBeEnabled())
    expect(screen.queryByTestId('landing')).not.toBeInTheDocument()
    expect(useAuthStore.getState().token).toBeFalsy()
  })

  it.each([
    ['Your subscription expired.', /subscription has expired/i],
    ['Your payment is pending.', /payment was not completed/i],
    ['Account suspended by admin.', /Account suspended by admin\./],
  ])('turns the account-state error "%s" into an alert instead of a field error', async (message, shown) => {
    const user = userEvent.setup()
    api('post', LOGIN, { status: false, message: 'Blocked', errors: { email: message } }, 403)
    const { container } = mount()

    await fillAndSubmit(user)

    await waitFor(() => expect(container.querySelector('.alert-danger')).toHaveTextContent(shown))
    expect(container.querySelector('#useremail + .invalid-feedback')).toBeNull()
  })

  it('disables the button while the request is in flight', async () => {
    const user = userEvent.setup()
    let release: () => void = () => {}
    const held = new Promise<void>((resolve) => { release = resolve })
    server.use(
      http.post('*/auth/login', async () => {
        await held
        return HttpResponse.json({ status: false, message: 'Invalid credentials.' }, { status: 401 })
      })
    )
    mount()

    await fillAndSubmit(user)

    expect(await screen.findByRole('button', { name: /signing in/i })).toBeDisabled()
    release()
    expect(await screen.findByRole('button', { name: 'Sign In' })).toBeEnabled()
  })
})
