import { beforeEach, describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { screen, waitFor } from '../../test-utils'
import { allowBackgroundCalls, api, invalid, renderPage, signIn } from '../pageHarness'

vi.mock('react-toastify', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-toastify')>()
  return { ...actual, toast: Object.assign(vi.fn(), { info: vi.fn(), success: vi.fn(), error: vi.fn(), warn: vi.fn() }) }
})

import { toast } from 'react-toastify'
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
