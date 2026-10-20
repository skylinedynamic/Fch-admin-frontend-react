import { afterEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../../mocks/server'
import { readEmailChangeLink, submitEmailChangeLink } from '../../../src/modules/account/services'

afterEach(() => server.resetHandlers())

/**
 * An email-change link opens on the portal; the page reads and acts on it
 * through the API endpoint at the same path, passing the link's expires and
 * signature along exactly as they came - the API checks the signature.
 */
const LINK = { action: 'confirm' as const, user: '251', hash: 'abc123', query: '?expires=1792567483&signature=2c7f' }
const READY = { action: 'confirm', state: 'ready', title: 'Confirm your new email', message: 'Enter your password.', tone: 'info', button: 'Confirm', needs_password: true, login_url: null }

describe('readEmailChangeLink', () => {
  it('reads the link at the API path, passing its query along unchanged', async () => {
    let url = ''
    server.use(
      http.get('*/email-change/confirm/251/abc123', ({ request }) => {
        url = request.url
        return HttpResponse.json({ status: true, message: 'ok', data: READY })
      })
    )

    await expect(readEmailChangeLink(LINK)).resolves.toEqual(READY)
    expect(new URL(url).search).toBe('?expires=1792567483&signature=2c7f')
  })
})

describe('submitEmailChangeLink', () => {
  it('posts the password to the same signed path', async () => {
    let url = ''
    let body: unknown = null
    server.use(
      http.post('*/email-change/confirm/251/abc123', async ({ request }) => {
        url = request.url
        body = await request.json()
        return HttpResponse.json({ status: true, message: 'ok', data: { ...READY, state: 'changed', needs_password: false } })
      })
    )

    const result = await submitEmailChangeLink(LINK, 'secret')

    expect(result.state).toBe('changed')
    expect(body).toEqual({ password: 'secret' })
    expect(new URL(url).search).toBe('?expires=1792567483&signature=2c7f')
  })

  it('sends no password for cancel and undo', async () => {
    let body: unknown = 'unset'
    server.use(
      http.post('*/email-change/cancel/251/abc123', async ({ request }) => {
        body = await request.json()
        return HttpResponse.json({ status: true, message: 'ok', data: { ...READY, action: 'cancel', state: 'cancelled' } })
      })
    )

    await submitEmailChangeLink({ ...LINK, action: 'cancel' })

    expect(body).toEqual({})
  })
})
