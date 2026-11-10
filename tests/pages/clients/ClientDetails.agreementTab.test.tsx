import { describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { screen, waitFor } from '../../test-utils'
import { allowBackgroundCalls, api, renderPage, signIn } from '../pageHarness'

vi.mock('react-toastify', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-toastify')>()
  return { ...actual, toast: Object.assign(vi.fn(), { info: vi.fn(), success: vi.fn(), error: vi.fn(), warn: vi.fn() }) }
})
vi.mock('bootstrap/js/dist/modal', () => import('../../mocks/fakeBootstrapModal'))
vi.mock('../../../src/hooks/useSummernote', () => ({ useSummernote: () => ({ editorRef: () => {} }) }))

import ClientDetails from '../../../src/pages/clients/ClientDetails'

/**
 * The Agreement tab used to appear only once a client had signed. The host
 * now also uses it to excuse one client from signing, so the host sees it
 * before then; a partner still sees it only once there is a signed agreement.
 */
const client = (overrides: Record<string, unknown> = {}) => ({
  status: true,
  message: 'ok',
  data: { id: 136, user_id: 55, first_name: 'Bo', last_name: 'Rower', email: 'bo@example.test', has_sign: false, agreement_required: true, ...overrides },
})

describe('ClientDetails - Agreement tab', () => {
  it('lets the host open it before the client has signed, to excuse them', async () => {
    signIn({ is_host: 1, permissions: ['view clients', 'update clients'] })
    allowBackgroundCalls()
    api('get', '/common/borrowers/136', client())
    api('get', '/common/agreement-sign/required/55', { status: true, message: 'ok', data: { user_id: 55, agreement_required: true, signing_enabled: true, template_active: true, can_change: true, locked_reason: null } })

    renderPage(<ClientDetails />, { path: '/clients/:id', route: '/clients/136' })

    await userEvent.click(await screen.findByRole('tab', { name: 'Agreement' }))

    expect(await screen.findByRole('switch', { name: /require this client to sign/i, checked: true })).toBeEnabled()
  })

  it('changes the switch in place - the client is not loaded again', async () => {
    signIn({ is_host: 1, permissions: ['view clients', 'update clients'] })
    allowBackgroundCalls()
    const details = api('get', '/common/borrowers/136', client())
    api('get', '/common/agreement-sign/required/55', { status: true, message: 'ok', data: { user_id: 55, agreement_required: true, signing_enabled: true, template_active: true, can_change: true, locked_reason: null } })
    const sent = api('post', '/common/agreement-sign/required/55', { status: true, message: 'ok', data: { user_id: 55, agreement_required: false } })

    renderPage(<ClientDetails />, { path: '/clients/:id', route: '/clients/136' })
    await userEvent.click(await screen.findByRole('tab', { name: 'Agreement' }))
    const toggle = await screen.findByRole('switch', { name: /require this client to sign/i, checked: true })
    await waitFor(() => expect(toggle).toBeEnabled())
    const detailCalls = details.calls

    await userEvent.click(toggle)

    await waitFor(() => expect(sent.bodies).toEqual([{ required: false }]))
    await waitFor(() => expect(screen.getByRole('switch', { name: /require this client to sign/i })).not.toBeChecked())
    expect(details.calls).toBe(detailCalls)
  })

  it('is not shown to a partner until the client has signed', async () => {
    signIn({ is_host: 0, permissions: ['view clients', 'update clients'] })
    allowBackgroundCalls()
    api('get', '/common/borrowers/136', client())

    renderPage(<ClientDetails />, { path: '/clients/:id', route: '/clients/136' })

    expect(await screen.findByRole('tab', { name: 'Funding Applications' })).toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: 'Agreement' })).not.toBeInTheDocument()
  })
})
