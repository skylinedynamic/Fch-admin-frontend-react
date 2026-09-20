import { afterEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../../mocks/server'
import { updatePassword, updateProfile, updateProfilePicture } from '../../../src/modules/auth-profile/services'

afterEach(() => server.resetHandlers())

describe('auth-profile services', () => {
  it('updatePassword posts the password payload', async () => {
    let receivedBody: unknown = null
    server.use(
      http.post('*/common/auth-profile/update-password', async ({ request }) => {
        receivedBody = await request.json()
        return HttpResponse.json({ status: true, message: 'Password updated' })
      })
    )
    const payload = { current_password: 'old', new_password: 'new', new_password_confirmation: 'new' } as any
    await updatePassword(payload)
    expect(receivedBody).toEqual(payload)
  })

  it('updateProfile posts the profile payload', async () => {
    let receivedBody: unknown = null
    server.use(
      http.post('*/common/auth-profile/update-profile', async ({ request }) => {
        receivedBody = await request.json()
        return HttpResponse.json({ status: true, message: 'Profile updated' })
      })
    )
    await updateProfile({ name: 'Admin User' } as any)
    expect(receivedBody).toEqual({ name: 'Admin User' })
  })

  it('updateProfilePicture posts the image payload', async () => {
    let receivedBody: unknown = null
    server.use(
      http.post('*/common/auth-profile/update-profile-picture', async ({ request }) => {
        receivedBody = await request.json()
        return HttpResponse.json({ status: true, message: 'Picture updated' })
      })
    )
    await updateProfilePicture({ image: 'data:image/png;base64,...' })
    expect(receivedBody).toEqual({ image: 'data:image/png;base64,...' })
  })
})
