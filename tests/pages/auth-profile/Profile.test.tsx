import { beforeEach, describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { act, screen, waitFor } from '../../test-utils'
import { allowBackgroundCalls, api, invalid, renderPage, signIn } from '../pageHarness'

vi.mock('react-toastify', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-toastify')>()
  return { ...actual, toast: Object.assign(vi.fn(), { info: vi.fn(), success: vi.fn(), error: vi.fn(), warn: vi.fn() }) }
})

// The file manager is its own suite; here it only hands back the picked file.
vi.mock('../../../src/components/FileManagerModal/FileManagerModal', () => ({
  FileManagerModal: ({ isOpen, onSelectFiles }: any) =>
    isOpen ? <button type="button" onClick={() => onSelectFiles([{ path: '/qa-12mb.png' }])}>Pick qa-12mb.png</button> : null,
}))

import { toast } from 'react-toastify'
import { useAuthStore } from '../../../src/store/auth'
import Profile from '../../../src/pages/auth-profile/Profile'

const PROFILE = '/common/auth-profile/update-profile'
const PASSWORD = '/common/auth-profile/update-password'

const mount = () => {
  signIn({ name: 'Host Admin Senior', email: 'host@example.test', phone_number: '5551234567' })
  allowBackgroundCalls()
  return renderPage(<Profile />, { path: '/profile' })
}

const submit = (container: HTMLElement, form: 'profile-form' | 'password-form') =>
  container.querySelector(`button[form="${form}"]`) as HTMLButtonElement

const openPasswordTab = async (user: ReturnType<typeof userEvent.setup>, container: HTMLElement) => {
  await user.click(container.querySelector('.ri-lock-password-line')!.closest('button, a')!)
  await screen.findByPlaceholderText('Enter current password')
}

beforeEach(() => vi.clearAllMocks())

/**
 * BUG-204: the email was read-only and Save ignored it. It can now be edited;
 * a new email waits for confirmation from the link sent to it, and Profile
 * says so with the same notice (resend / cancel) as the Users screen.
 */
describe('Profile - changing the sign-in email', () => {
  it('lets the email be edited', () => {
    mount()

    expect(screen.getByPlaceholderText('Enter your email')).not.toHaveAttribute('readonly')
  })

  it('sends a new email and shows that it waits for confirmation', async () => {
    const user = userEvent.setup()
    const { container } = mount()
    const message = 'A confirmation link has been sent to new.host@example.test. The email will change once it is confirmed.'
    const update = api('post', PROFILE, { status: true, message, data: { id: 1, email: 'host@example.test', pending_email: 'new.host@example.test' } })
    api('get', '/common/refresh-user', {
      status: true,
      data: { id: 1, name: 'Host Admin Senior', email: 'host@example.test', pending_email: 'new.host@example.test', is_host: 1, entity_type: 'Partner', partner_id: 1, permissions: [] },
    })

    await user.clear(screen.getByPlaceholderText('Enter your email'))
    await user.type(screen.getByPlaceholderText('Enter your email'), 'new.host@example.test')
    await user.click(submit(container, 'profile-form'))

    await waitFor(() => expect(update.bodies[0]).toMatchObject({ email: 'new.host@example.test' }))
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith(message))
    const notice = await screen.findByText(/Waiting for confirmation from/)
    expect(notice).toHaveTextContent('new.host@example.test')
    // The sign-in email stays the current one until the link is followed; the
    // notice names it and the field shows the pending one (BUG-203).
    expect(notice).toHaveTextContent('Sign-in stays host@example.test')
    await waitFor(() => expect(screen.getByPlaceholderText('Enter your email')).toHaveValue('new.host@example.test'))
  })

  // BUG-203: while a change waits the field shows the pending email.
  it('saving only the name while a change waits sends the pending email back, so it stays', async () => {
    const user = userEvent.setup()
    signIn({ id: 1, name: 'Host Admin Senior', email: 'host@example.test', pending_email: 'new.host@example.test' })
    allowBackgroundCalls()
    const update = api('post', PROFILE, { status: true, message: 'Profile updated successfully.', data: { id: 1, email: 'host@example.test', pending_email: 'new.host@example.test' } })
    const { container } = renderPage(<Profile />, { path: '/profile' })

    expect(await screen.findByPlaceholderText('Enter your email')).toHaveValue('new.host@example.test')
    await user.click(submit(container, 'profile-form'))

    await waitFor(() => expect(update.bodies[0]).toMatchObject({ email: 'new.host@example.test' }))
  })

  it('typing the current email back in withdraws the change', async () => {
    const user = userEvent.setup()
    signIn({ id: 1, name: 'Host Admin Senior', email: 'host@example.test', pending_email: 'new.host@example.test' })
    allowBackgroundCalls()
    const message = 'The pending email change has been cancelled.'
    const update = api('post', PROFILE, { status: true, message, data: { id: 1, email: 'host@example.test', pending_email: null } })
    api('get', '/common/refresh-user', {
      status: true,
      data: { id: 1, name: 'Host Admin Senior', email: 'host@example.test', pending_email: null, is_host: 1, entity_type: 'Partner', partner_id: 1, permissions: [] },
    })
    const { container } = renderPage(<Profile />, { path: '/profile' })

    const email = await screen.findByPlaceholderText('Enter your email')
    await user.clear(email)
    await user.type(email, 'host@example.test')
    await user.click(submit(container, 'profile-form'))

    await waitFor(() => expect(update.bodies[0]).toMatchObject({ email: 'host@example.test' }))
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith(message))
    await waitFor(() => expect(screen.queryByText(/Waiting for confirmation from/)).not.toBeInTheDocument())
    expect(screen.getByPlaceholderText('Enter your email')).toHaveValue('host@example.test')
  })

  // The notice reads the signed-in user kept in the browser; a cancel that
  // left it there showed the withdrawn change again after a reload.
  it('Cancel change also clears it from the signed-in user, so a reload does not bring it back', async () => {
    const user = userEvent.setup()
    signIn({ id: 1, name: 'Host Admin Senior', email: 'host@example.test', pending_email: 'new.host@example.test' })
    allowBackgroundCalls()
    const cancel = api('post', '/common/email-change/cancel', { status: true, message: 'The pending email change has been cancelled.', data: { pending_email: null } })
    const { unmount } = renderPage(<Profile />, { path: '/profile' })

    await user.click(await screen.findByRole('button', { name: 'Cancel change' }))

    await waitFor(() => expect(cancel.calls).toBe(1))
    await waitFor(() => expect(useAuthStore.getState().user?.pending_email ?? null).toBeNull())
    expect(useAuthStore.getState().user?.email).toBe('host@example.test')
    // The field goes back to the email still in use.
    await waitFor(() => expect(screen.getByPlaceholderText('Enter your email')).toHaveValue('host@example.test'))

    // "Reload": the page opens again from the stored user.
    unmount()
    renderPage(<Profile />, { path: '/profile' })
    await screen.findByPlaceholderText('Enter your email')
    expect(screen.queryByText(/Waiting for confirmation from/)).not.toBeInTheDocument()
  })

  // The host cancelled it: the API flags is_refresh, the panel reloads the
  // signed-in user, and Profile follows that user.
  it('drops the notice when the signed-in user is reloaded without the pending change', async () => {
    signIn({ id: 1, name: 'Host Admin Senior', email: 'host@example.test', pending_email: 'new.host@example.test' })
    allowBackgroundCalls()
    renderPage(<Profile />, { path: '/profile' })
    expect(await screen.findByText(/Waiting for confirmation from/)).toBeInTheDocument()

    act(() => {
      const { user, token } = useAuthStore.getState()
      useAuthStore.setState({ token, user: { ...user, pending_email: null } } as never)
    })

    await waitFor(() => expect(screen.queryByText(/Waiting for confirmation from/)).not.toBeInTheDocument())
  })

  it('shows a change still waiting for confirmation when the page opens', async () => {
    signIn({ name: 'Host Admin Senior', email: 'host@example.test', pending_email: 'new.host@example.test' })
    allowBackgroundCalls()
    renderPage(<Profile />, { path: '/profile' })

    expect(await screen.findByText(/Waiting for confirmation from/)).toHaveTextContent('new.host@example.test')
    expect(screen.getByPlaceholderText('Enter your email')).toHaveValue('new.host@example.test')
  })
})

describe('Profile - details', () => {
  it('prefills from the signed-in user, keeping everything after the first word as the last name', () => {
    mount()

    expect(screen.getByPlaceholderText('Enter your first name')).toHaveValue('Host')
    expect(screen.getByPlaceholderText('Enter your last name')).toHaveValue('Admin Senior')
    expect(screen.getByPlaceholderText('Enter your email')).toHaveValue('host@example.test')
    expect(screen.getByPlaceholderText('Enter your phone number')).toHaveValue('(555) 123-4567')
  })

  it('requires a first and last name', async () => {
    const user = userEvent.setup()
    const { container } = mount()
    const update = api('post', PROFILE, { status: true })

    await user.clear(screen.getByPlaceholderText('Enter your first name'))
    await user.clear(screen.getByPlaceholderText('Enter your last name'))
    await user.click(submit(container, 'profile-form'))

    expect(await screen.findByText('First name is required')).toBeInTheDocument()
    expect(screen.getByText('Last name is required')).toBeInTheDocument()
    expect(update.calls).toBe(0)
  })

  it('posts the profile without the image field', async () => {
    const user = userEvent.setup()
    const { container } = mount()
    const update = api('post', PROFILE, { status: true, message: 'Profile updated successfully!' })

    await user.clear(screen.getByPlaceholderText('Enter your first name'))
    await user.type(screen.getByPlaceholderText('Enter your first name'), 'Hosta')
    await user.click(submit(container, 'profile-form'))

    await waitFor(() => expect(update.bodies[0]).toMatchObject({ first_name: 'Hosta', last_name: 'Admin Senior', email: 'host@example.test' }))
    expect(update.bodies[0]).not.toHaveProperty('image')
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Profile updated successfully!'))
  })

  it('shows API field errors under the fields', async () => {
    const user = userEvent.setup()
    const { container } = mount()
    api('post', PROFILE, invalid({ phone_number: 'The phone number is not valid.' }), 422)

    await user.click(submit(container, 'profile-form'))

    expect(await screen.findByText('The phone number is not valid.')).toBeInTheDocument()
  })

  it('reports a status:false response', async () => {
    const user = userEvent.setup()
    const { container } = mount()
    api('post', PROFILE, { status: false, message: 'Profile is locked.' })

    await user.click(submit(container, 'profile-form'))

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Profile is locked.'))
  })

  it('reports an unexpected failure generically', async () => {
    const user = userEvent.setup()
    const { container } = mount()
    api('post', PROFILE, { message: 'boom' }, 500)

    await user.click(submit(container, 'profile-form'))

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Something went wrong. Please try again.'))
  })
})

describe('Profile - change password', () => {
  const fill = async (user: ReturnType<typeof userEvent.setup>, current: string, next: string, confirm = next) => {
    if (current) await user.type(screen.getByPlaceholderText('Enter current password'), current)
    if (next) await user.type(screen.getByPlaceholderText('Enter new password'), next)
    if (confirm) await user.type(screen.getByPlaceholderText('Confirm new password'), confirm)
  }

  it('requires all three fields', async () => {
    const user = userEvent.setup()
    const { container } = mount()
    const update = api('post', PASSWORD, { status: true })
    await openPasswordTab(user, container)

    await user.click(submit(container, 'password-form'))

    expect(await screen.findByText('Current password is required')).toBeInTheDocument()
    expect(screen.getByText('New password is required')).toBeInTheDocument()
    expect(screen.getByText('Please confirm your new password')).toBeInTheDocument()
    expect(update.calls).toBe(0)
  })

  it('rejects a new password under 8 characters', async () => {
    const user = userEvent.setup()
    const { container } = mount()
    await openPasswordTab(user, container)

    await fill(user, 'OldPassw0rd', 'short1')
    await user.click(submit(container, 'password-form'))

    expect(await screen.findByText('Password must be at least 8 characters')).toBeInTheDocument()
  })

  it('rejects a confirmation that does not match', async () => {
    const user = userEvent.setup()
    const { container } = mount()
    const update = api('post', PASSWORD, { status: true })
    await openPasswordTab(user, container)

    await fill(user, 'OldPassw0rd', 'NewPassw0rd', 'Different0')
    await user.click(submit(container, 'password-form'))

    expect(await screen.findByText('Passwords do not match')).toBeInTheDocument()
    expect(update.calls).toBe(0)
  })

  it('posts a valid change and clears the form', async () => {
    const user = userEvent.setup()
    const { container } = mount()
    const update = api('post', PASSWORD, { status: true, message: 'Password updated successfully.' })
    await openPasswordTab(user, container)

    await fill(user, 'OldPassw0rd', 'NewPassw0rd')
    await user.click(submit(container, 'password-form'))

    await waitFor(() =>
      expect(update.bodies[0]).toEqual({ current_password: 'OldPassw0rd', new_password: 'NewPassw0rd', new_password_confirmation: 'NewPassw0rd' })
    )
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Password updated successfully.'))
    await waitFor(() => expect(screen.getByPlaceholderText('Enter current password')).toHaveValue(''))
  })

  it('shows a wrong current password under the field', async () => {
    const user = userEvent.setup()
    const { container } = mount()
    api('post', PASSWORD, invalid({ current_password: 'The current password is incorrect.' }), 422)
    await openPasswordTab(user, container)

    await fill(user, 'WrongPassw0rd', 'NewPassw0rd')
    await user.click(submit(container, 'password-form'))

    expect(await screen.findByText('The current password is incorrect.')).toBeInTheDocument()
  })

  it('clears a field error as soon as the field is edited', async () => {
    const user = userEvent.setup()
    const { container } = mount()
    await openPasswordTab(user, container)
    await user.click(submit(container, 'password-form'))
    expect(await screen.findByText('Current password is required')).toBeInTheDocument()

    await user.type(screen.getByPlaceholderText('Enter current password'), 'x')

    expect(screen.queryByText('Current password is required')).not.toBeInTheDocument()
  })
})

/**
 * BUG-014 (QA round 2): a 12 MB file that only started like a PNG could be set
 * as the profile picture. The API now refuses it; the page shows its reason
 * instead of "Something went wrong".
 */
describe('Profile - picture', () => {
  const PICTURE = '/common/auth-profile/update-profile-picture'

  it('shows the API reason when the picked picture is refused', async () => {
    const user = userEvent.setup()
    const { container } = mount()
    const seen = api('post', PICTURE, invalid({ image: 'This file is too large. The maximum size is 5 MB.' }), 422)

    await user.click(container.querySelector('.btn.rounded-circle.position-absolute') as HTMLButtonElement)
    await user.click(await screen.findByRole('button', { name: 'Pick qa-12mb.png' }))

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('This file is too large. The maximum size is 5 MB.'))
    expect(seen.bodies[0]).toEqual({ image: '/qa-12mb.png' })
  })
})
