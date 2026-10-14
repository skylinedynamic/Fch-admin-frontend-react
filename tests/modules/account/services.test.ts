import { afterEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../../mocks/server'
import { cancelEmailChange, resendEmailChange } from '../../../src/modules/account/services'

afterEach(() => server.resetHandlers())

describe('resendEmailChange', () => {
  it('POSTs the user id as a number and returns the unwrapped pending change', async () => {
    let body: unknown = null
    server.use(
      http.post('*/common/email-change/resend', async ({ request }) => {
        body = await request.json()
        return HttpResponse.json({ status: true, message: 'sent', data: { pending_email: 'new@x.com' } })
      })
    )

    const result = await resendEmailChange('42')

    expect(body).toEqual({ user_id: 42 })
    expect(result).toEqual({ pending_email: 'new@x.com' })
  })

  it('rejects when the API refuses the request', async () => {
    server.use(
      http.post('*/common/email-change/resend', () =>
        HttpResponse.json({ status: false, message: 'No pending change.' }, { status: 422 })
      )
    )

    await expect(resendEmailChange(7)).rejects.toMatchObject({ response: { status: 422 } })
  })
})

describe('cancelEmailChange', () => {
  it('POSTs the user id as a number and returns the unwrapped result', async () => {
    let body: unknown = null
    server.use(
      http.post('*/common/email-change/cancel', async ({ request }) => {
        body = await request.json()
        return HttpResponse.json({ status: true, message: 'cancelled', data: { pending_email: null } })
      })
    )

    const result = await cancelEmailChange(9)

    expect(body).toEqual({ user_id: 9 })
    expect(result).toEqual({ pending_email: null })
  })
})
