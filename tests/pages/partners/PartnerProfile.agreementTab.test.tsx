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

import PartnerProfile from '../../../src/pages/partners/PartnerProfile'

/**
 * The Agreement tab used to appear only once a partner had signed. The host
 * now also uses it to excuse one partner from the partner agreement, so the
 * host sees it before then - never on the host's own profile, which signs
 * nothing.
 */
const partner = (overrides: Record<string, unknown> = {}) => ({
  status: true,
  message: 'ok',
  data: {
    id: 21,
    user_id: 77,
    company_name: 'Pentagon Funding Group',
    partner_type: 'White-Label Partner (WL)',
    is_host: false,
    has_sign: false,
    agreement_required: true,
    ...overrides,
  },
})

describe('PartnerProfile - Agreement tab', () => {
  it('lets the host open it before the partner has signed, to excuse them', async () => {
    signIn({ is_host: 1, permissions: ['view partners', 'update partners'] })
    allowBackgroundCalls()
    api('get', '/admin/partners-details/21', partner())
    api('get', '/common/agreement-sign/required/77', { status: true, message: 'ok', data: { user_id: 77, agreement_required: true, signing_enabled: true, template_active: true, can_change: true, locked_reason: null } })

    renderPage(<PartnerProfile />, { path: '/partners/:id', route: '/partners/21' })

    await userEvent.click(await screen.findByRole('tab', { name: 'Agreement' }))

    expect(await screen.findByRole('switch', { name: /require this partner to sign/i, checked: true })).toBeEnabled()
  })

  it('changes the switch in place - the profile is not loaded again', async () => {
    signIn({ is_host: 1, permissions: ['view partners', 'update partners'] })
    allowBackgroundCalls()
    const details = api('get', '/admin/partners-details/21', partner({ full_name: 'Pat Partner' }))
    api('get', '/common/agreement-sign/required/77', { status: true, message: 'ok', data: { user_id: 77, agreement_required: true, signing_enabled: true, template_active: true, can_change: true, locked_reason: null } })
    const sent = api('post', '/common/agreement-sign/required/77', { status: true, message: 'ok', data: { user_id: 77, agreement_required: false } })

    renderPage(<PartnerProfile />, { path: '/partners/:id', route: '/partners/21' })
    await userEvent.click(await screen.findByRole('tab', { name: 'Agreement' }))
    const toggle = await screen.findByRole('switch', { name: /require this partner to sign/i, checked: true })
    await waitFor(() => expect(toggle).toBeEnabled())
    const detailCalls = details.calls

    await userEvent.click(toggle)

    await waitFor(() => expect(sent.bodies).toEqual([{ required: false }]))
    await waitFor(() => expect(screen.getByRole('switch', { name: /require this partner to sign/i })).not.toBeChecked())
    expect(details.calls).toBe(detailCalls)

    // Still off after leaving the tab and coming back (the API now says so too).
    api('get', '/common/agreement-sign/required/77', { status: true, message: 'ok', data: { user_id: 77, agreement_required: false, signing_enabled: true, template_active: true, can_change: true, locked_reason: null } })
    await userEvent.click(screen.getByRole('tab', { name: /Partner information/ }))
    await userEvent.click(screen.getByRole('tab', { name: 'Agreement' }))
    expect(await screen.findByRole('switch', { name: /require this partner to sign/i })).not.toBeChecked()
  })

  it("is not shown on the host's own profile", async () => {
    signIn({ is_host: 1, permissions: ['view partners', 'update partners'] })
    allowBackgroundCalls()
    const details = api('get', '/admin/partners-details/21', partner({ is_host: true }))

    renderPage(<PartnerProfile />, { path: '/partners/:id', route: '/partners/21' })

    await waitFor(() => expect(details.calls).toBe(1))
    await waitFor(() => expect(screen.getAllByRole('tab').length).toBeGreaterThan(0))
    expect(screen.queryByRole('tab', { name: 'Agreement' })).not.toBeInTheDocument()
  })
})
