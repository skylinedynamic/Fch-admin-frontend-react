import { afterEach, describe, expect, it } from 'vitest'
import userEvent from '@testing-library/user-event'
import { screen, waitFor } from '@testing-library/react'
import { server } from '../../mocks/server'
import { api, renderPage, signOut } from '../pageHarness'
import EmailChangeLinkPage from '../../../src/pages/email-change/EmailChangeLinkPage'

/**
 * Where an email-change link lands: the page reads the link from the API,
 * shows what it is about, and confirms (with the password), cancels or undoes
 * the change on the user's say-so. Nobody needs to be signed in.
 */
const PATH = '/email-change/:action/:user/:hash'
const QUERY = '?expires=1792567483&signature=2c7f'
const CONFIRM = `/email-change/confirm/251/abc123${QUERY}`

const linkData = (overrides: Record<string, unknown> = {}) => ({
  status: true,
  message: 'ok',
  data: {
    action: 'confirm',
    state: 'ready',
    title: 'Confirm your new email',
    message: 'Enter your password to start signing in with new@example.test.',
    tone: 'info',
    button: 'Confirm new email',
    needs_password: true,
    login_url: null,
    ...overrides,
  },
})

describe('Email change link page', () => {
  afterEach(() => {
    server.resetHandlers()
    signOut()
  })

  it('shows what the link is about and asks for the password, changing nothing yet', async () => {
    signOut()
    api('get', '/email-change/confirm/251/abc123', linkData())
    const submit = api('post', '/email-change/confirm/251/abc123', linkData({ state: 'changed' }))

    renderPage(<EmailChangeLinkPage />, { path: PATH, route: CONFIRM })

    expect(await screen.findByRole('heading', { name: 'Confirm your new email' })).toBeInTheDocument()
    expect(screen.getByText('Enter your password to start signing in with new@example.test.')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Confirm new email' })).toBeInTheDocument()
    expect(submit.calls).toBe(0)
  })

  it('confirms with the password and then offers sign-in', async () => {
    api('get', '/email-change/confirm/251/abc123', linkData())
    const submit = api('post', '/email-change/confirm/251/abc123', linkData({
      state: 'changed', title: 'Email changed', message: 'You now sign in with new@example.test.', tone: 'success',
      button: null, needs_password: false, login_url: 'https://admin.wl.com/login',
    }))
    const user = userEvent.setup()
    renderPage(<EmailChangeLinkPage />, { path: PATH, route: CONFIRM })

    await user.type(await screen.findByLabelText('Password'), 'secret')
    await user.click(screen.getByRole('button', { name: 'Confirm new email' }))

    expect(await screen.findByRole('heading', { name: 'Email changed' })).toBeInTheDocument()
    expect(submit.bodies[0]).toEqual({ password: 'secret' })
    expect(new URL(submit.urls[0]).search).toBe(QUERY)
    expect(screen.getByRole('link', { name: /sign in/i })).toHaveAttribute('href', 'https://admin.wl.com/login')
    expect(screen.queryByLabelText('Password')).not.toBeInTheDocument()
  })

  it('shows a wrong password under the field and keeps the form', async () => {
    api('get', '/email-change/confirm/251/abc123', linkData())
    api('post', '/email-change/confirm/251/abc123', linkData({ state: 'wrong_password', message: 'That password is not right.', tone: 'danger' }))
    const user = userEvent.setup()
    renderPage(<EmailChangeLinkPage />, { path: PATH, route: CONFIRM })

    await user.type(await screen.findByLabelText('Password'), 'guess')
    await user.click(screen.getByRole('button', { name: 'Confirm new email' }))

    expect(await screen.findByText('That password is not right.')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toHaveClass('is-invalid')
    expect(screen.getByRole('button', { name: 'Confirm new email' })).toBeEnabled()
  })

  it('needs a password before confirming', async () => {
    api('get', '/email-change/confirm/251/abc123', linkData())
    const submit = api('post', '/email-change/confirm/251/abc123', linkData({ state: 'changed' }))
    const user = userEvent.setup()
    renderPage(<EmailChangeLinkPage />, { path: PATH, route: CONFIRM })

    await user.click(await screen.findByRole('button', { name: 'Confirm new email' }))

    expect(await screen.findByText('Enter your password.')).toBeInTheDocument()
    expect(submit.calls).toBe(0)
  })

  it('explains an invalid or expired link, with a way back to sign-in', async () => {
    api('get', '/email-change/confirm/251/abc123', linkData({
      state: 'invalid', title: 'This link no longer works', message: 'It has expired or was already used.', tone: 'warning', button: null, needs_password: false,
    }))
    renderPage(<EmailChangeLinkPage />, { path: PATH, route: CONFIRM })

    expect(await screen.findByRole('heading', { name: 'This link no longer works' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Password')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /sign in/i })).toHaveAttribute('href', '/login')
  })

  it('cancels a pending change without a password', async () => {
    const route = `/email-change/cancel/251/abc123${QUERY}`
    api('get', '/email-change/cancel/251/abc123', linkData({ action: 'cancel', title: 'Cancel this change?', button: 'Cancel the change', needs_password: false }))
    const submit = api('post', '/email-change/cancel/251/abc123', linkData({ action: 'cancel', state: 'cancelled', title: 'Change cancelled', tone: 'success', button: null, needs_password: false }))
    const user = userEvent.setup()
    renderPage(<EmailChangeLinkPage />, { path: PATH, route })

    expect(await screen.findByRole('heading', { name: 'Cancel this change?' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Password')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Cancel the change' }))

    expect(await screen.findByRole('heading', { name: 'Change cancelled' })).toBeInTheDocument()
    expect(submit.bodies[0]).toEqual({})
  })

  it('treats an unknown action as an invalid link without asking the API', async () => {
    const read = api('get', '/email-change/delete/251/abc123', linkData())
    renderPage(<EmailChangeLinkPage />, { path: PATH, route: `/email-change/delete/251/abc123${QUERY}` })

    expect(await screen.findByRole('heading', { name: /link is not valid/i })).toBeInTheDocument()
    await waitFor(() => expect(read.calls).toBe(0))
  })
})
