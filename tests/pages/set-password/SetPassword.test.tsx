import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import userEvent from '@testing-library/user-event'
import { renderWithProviders, screen, waitFor } from '../../test-utils'
import { server } from '../../mocks/server'
import { useAuthStore } from '../../../src/store/auth'
import SetPassword from '../../../src/pages/set-password/SetPassword'
import { PORTAL_HOME_ROUTE } from '../../../src/config/passwordChange'

const navigateMock = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => navigateMock }
})

const UPDATE_URL = '*/common/auth-profile/update-password'

const fill = async (user: ReturnType<typeof userEvent.setup>, current: string, next: string, confirm = next) => {
  await user.type(screen.getByLabelText(/Temporary Password/i), current)
  await user.type(screen.getByLabelText(/^New Password/i), next)
  await user.type(screen.getByLabelText(/Confirm New Password/i), confirm)
  await user.click(screen.getByRole('button', { name: /Set Password/i }))
}

// The forced screen after signing in with an issued password: choose your own,
// or sign out - nothing else.
describe('SetPassword', () => {
  beforeEach(() => {
    useAuthStore.setState({ token: 'abc', user: { id: 7, name: 'Ada', must_change_password: true } })
    // The Auth layout paints the brand on mount; not under test here.
    server.use(http.get('*/common/branding', () => HttpResponse.json({ status: false })))
  })

  afterEach(() => {
    server.resetHandlers()
    navigateMock.mockClear()
    useAuthStore.setState({ token: undefined, user: null })
  })

  it('greets the user by first name', () => {
    useAuthStore.setState({ token: 'abc', user: { id: 7, name: 'Ada Lovelace', must_change_password: true } })
    renderWithProviders(<SetPassword />)

    expect(screen.getByText('Hi Ada, you signed in with a temporary password. Choose your own to continue.')).toBeInTheDocument()
  })

  it('keeps the plain wording when the user has no name', () => {
    useAuthStore.setState({ token: 'abc', user: { id: 7, must_change_password: true } })
    renderWithProviders(<SetPassword />)

    expect(screen.getByText('You signed in with a temporary password. Choose your own to continue.')).toBeInTheDocument()
  })

  it('says why it is shown and offers nothing but the form and signing out', () => {
    renderWithProviders(<SetPassword />)

    expect(screen.getByRole('heading', { name: /Set your new password/i })).toBeInTheDocument()
    expect(document.querySelector('.avatar-title')).toBeNull()
    expect(screen.getByText(/temporary password/i, { selector: 'p' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Log Out/i })).toBeInTheDocument()
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
  })

  it('is laid out like the sign-in form: each field has an eye toggle and the button is the sign-in one', async () => {
    const user = userEvent.setup()
    renderWithProviders(<SetPassword />)

    const field = screen.getByLabelText(/^New Password/i)
    expect(field).toHaveAttribute('type', 'password')
    expect(screen.getAllByRole('button', { name: /Toggle password visibility/i })).toHaveLength(3)

    await user.click(screen.getAllByRole('button', { name: /Toggle password visibility/i })[1])

    expect(field).toHaveAttribute('type', 'text')
    expect(screen.getByRole('button', { name: /Set Password/i })).toHaveClass('btn-success')
    expect(screen.queryByText(/Use at least 8 characters/i)).not.toBeInTheDocument()
  })

  // Laid out like Profile > Change Password: the current password on its own
  // row, the new password and its confirmation side by side.
  it('lays the fields out like Profile: new and confirm side by side', () => {
    renderWithProviders(<SetPassword />)

    const newRow = screen.getByLabelText(/^New Password/i).closest('.row')
    expect(newRow).not.toBeNull()
    expect(newRow).toContainElement(screen.getByLabelText(/Confirm New Password/i))
    expect(newRow).not.toContainElement(screen.getByLabelText(/Temporary Password/i))
  })

  it('lists the password requirements', () => {
    renderWithProviders(<SetPassword />)

    expect(screen.getByRole('heading', { name: 'Password Requirements' })).toBeInTheDocument()
    const items = screen.getAllByRole('listitem').map((li) => li.textContent?.trim())
    expect(items).toEqual([
      'Minimum 8 characters long',
      'Include uppercase and lowercase letters',
      'Include at least one number',
      'Include at least one special character',
    ])
    // Nothing typed yet: none is met.
    screen.getAllByRole('listitem').forEach((li) => expect(li).toHaveAttribute('data-met', 'false'))
  })

  // The requirements in a light card, as on Profile > Change Password: an
  // empty circle per rule, a filled green check once it is met. No strength meter.
  it('shows the requirements in a light card, an empty circle turning into a green check', async () => {
    const user = userEvent.setup()
    renderWithProviders(<SetPassword />)

    const card = screen.getByRole('heading', { name: 'Password Requirements' }).closest('.password-requirements')
    expect(card).toHaveClass('bg-light', 'border', 'rounded')
    expect(card?.querySelectorAll('i.ri-checkbox-blank-circle-line')).toHaveLength(4)

    await user.type(screen.getByLabelText(/^New Password/i), 'abcD1#xyz')
    expect(card?.querySelectorAll('i.ri-checkbox-circle-fill.text-success')).toHaveLength(4)
    expect(screen.queryByText(/Password Strength/i)).not.toBeInTheDocument()
  })

  it('ticks each rule as the new password meets it', async () => {
    const user = userEvent.setup()
    renderWithProviders(<SetPassword />)
    const met = () => screen.getAllByRole('listitem').map((li) => li.getAttribute('data-met'))
    const field = screen.getByLabelText(/^New Password/i)

    await user.type(field, 'abc')
    expect(met()).toEqual(['false', 'false', 'false', 'false'])

    await user.type(field, 'D')
    expect(met()).toEqual(['false', 'true', 'false', 'false'])

    await user.type(field, '1')
    expect(met()).toEqual(['false', 'true', 'true', 'false'])

    await user.type(field, '#xyz')
    expect(met()).toEqual(['true', 'true', 'true', 'true'])
    expect(screen.getByText('Minimum 8 characters long').closest('li')).toHaveClass('text-success')

    await user.clear(field)
    expect(met()).toEqual(['false', 'false', 'false', 'false'])
  })

  it('sends the passwords, clears the mark and opens the portal', async () => {
    let body: unknown = null
    server.use(
      http.post(UPDATE_URL, async ({ request }) => {
        body = await request.json()
        return HttpResponse.json({ status: true, message: 'Password updated' })
      })
    )
    const user = userEvent.setup()
    renderWithProviders(<SetPassword />)

    await fill(user, 'a1b2c3d4', 'Chosen#Pass2026')

    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith(PORTAL_HOME_ROUTE, { replace: true }))
    expect(body).toEqual({
      current_password: 'a1b2c3d4',
      new_password: 'Chosen#Pass2026',
      new_password_confirmation: 'Chosen#Pass2026',
    })
    expect(useAuthStore.getState().user?.must_change_password).toBe(false)
  })

  it('shows the server reasons under their fields and keeps the mark', async () => {
    server.use(
      http.post(UPDATE_URL, () =>
        HttpResponse.json(
          {
            status: false,
            message: 'Validation failed',
            errors: {
              current_password: ['The current password is incorrect.'],
              new_password: ['The new password must be different from the current password.'],
            },
          },
          { status: 422 }
        )
      )
    )
    const user = userEvent.setup()
    renderWithProviders(<SetPassword />)

    await fill(user, 'wrong-one', 'Chosen#Pass2026')

    expect(await screen.findByText('The current password is incorrect.')).toBeInTheDocument()
    expect(screen.getByText('The new password must be different from the current password.')).toBeInTheDocument()
    expect(navigateMock).not.toHaveBeenCalled()
    expect(useAuthStore.getState().user?.must_change_password).toBe(true)
  })

  it('checks the form before calling the server', async () => {
    let called = false
    server.use(
      http.post(UPDATE_URL, () => {
        called = true
        return HttpResponse.json({ status: true })
      })
    )
    const user = userEvent.setup()
    renderWithProviders(<SetPassword />)

    await fill(user, 'a1b2c3d4', 'Chosen#Pass2026', 'Different#2026')

    expect(await screen.findByText('Passwords do not match')).toBeInTheDocument()
    expect(called).toBe(false)
  })

  it('signs out', async () => {
    server.use(http.post('*/auth/logout', () => HttpResponse.json({ status: true })))
    const user = userEvent.setup()
    renderWithProviders(<SetPassword />)

    await user.click(screen.getByRole('button', { name: /Log Out/i }))

    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith('/login', { replace: true }))
    expect(useAuthStore.getState().token).toBeUndefined()
  })
})
