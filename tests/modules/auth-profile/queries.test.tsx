import { afterEach, describe, expect, it } from 'vitest'
import { server } from '../../mocks/server'
import {
  queryKeys,
  useUpdatePassword,
  useUpdateProfile,
  useUpdateProfilePicture,
} from '../../../src/modules/auth-profile/queries'
import { runMutation, stub } from '../queryHarness'

afterEach(() => server.resetHandlers())

const BASE = '/common/auth-profile'

describe('auth-profile mutations', () => {
  it('exposes a stable cache key namespace', () => {
    expect(queryKeys.authProfile.all).toEqual(['auth-profile'])
  })

  it('useUpdatePassword posts all three password fields', async () => {
    const seen = stub('post', `${BASE}/update-password`, { status: true, message: 'Password updated.' })
    const payload = { current_password: 'Old1', new_password: 'NewPassw0rd', new_password_confirmation: 'NewPassw0rd' }

    const { outcome } = await runMutation(() => useUpdatePassword(), payload as never)

    expect(seen.bodies[0]).toEqual(payload)
    expect(outcome).toMatchObject({ status: true, message: 'Password updated.' })
  })

  it('useUpdatePassword surfaces a wrong current password as an error', async () => {
    stub('post', `${BASE}/update-password`, { status: false, message: 'Invalid', errors: { current_password: 'Incorrect.' } }, 422)

    const { error } = await runMutation(() => useUpdatePassword(), {} as never)

    expect((error as any).response.data.errors.current_password).toBe('Incorrect.')
  })

  it('useUpdateProfile posts the profile fields', async () => {
    const seen = stub('post', `${BASE}/update-profile`, { status: true, message: 'Profile updated.' })
    const payload = { first_name: 'Host', last_name: 'Admin', email: 'host@x.com', phone_number: '(555) 123-4567' }

    const { outcome } = await runMutation(() => useUpdateProfile(), payload as never)

    expect(seen.bodies[0]).toEqual(payload)
    expect(outcome).toMatchObject({ status: true })
  })

  it('useUpdateProfilePicture posts the chosen image path', async () => {
    const seen = stub('post', `${BASE}/update-profile-picture`, { status: true, message: 'Picture updated.' })

    await runMutation(() => useUpdateProfilePicture(), { image: 'avatars/me.png' })

    expect(seen.bodies[0]).toEqual({ image: 'avatars/me.png' })
  })
})
