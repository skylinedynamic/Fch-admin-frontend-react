import { describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { screen, within } from '../../test-utils'
import { allowBackgroundCalls, api, renderPage, signIn } from '../pageHarness'

vi.mock('react-toastify', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-toastify')>()
  return { ...actual, toast: Object.assign(vi.fn(), { info: vi.fn(), success: vi.fn(), error: vi.fn(), warn: vi.fn() }) }
})
vi.mock('bootstrap/js/dist/modal', () => import('../../mocks/fakeBootstrapModal'))
vi.mock('../../../src/hooks/useSummernote', () => ({ useSummernote: () => ({ editorRef: () => {} }) }))

import PartnerProfile from '../../../src/pages/partners/PartnerProfile'

/**
 * Partner profile › Mail Notification: where this partner's lead and client
 * notification emails go - a Lead Notification Recipient and a Client
 * Notification Recipient. The tab only lays the two fields out for now: they
 * are not saved or used for sending yet (no fch-api support).
 */
const partner = {
  status: true,
  message: 'ok',
  data: { id: 21, user_id: 77, company_name: 'Pentagon Funding Group', partner_type: 'White-Label Partner (WL)', is_host: false, has_sign: false },
}

const openTab = async () => {
  signIn({ is_host: 1, permissions: ['view partners', 'update partners'] })
  allowBackgroundCalls()
  api('get', '/admin/partners-details/21', partner)
  renderPage(<PartnerProfile />, { path: '/partners/:id', route: '/partners/21' })
  await userEvent.click(await screen.findByRole('tab', { name: 'Mail Notification' }))
}

describe('PartnerProfile - Mail Notification tab', () => {
  it('lists Mail Notification among the partner tabs', async () => {
    signIn({ is_host: 1, permissions: ['view partners', 'update partners'] })
    allowBackgroundCalls()
    api('get', '/admin/partners-details/21', partner)
    renderPage(<PartnerProfile />, { path: '/partners/:id', route: '/partners/21' })

    const tabs = within(await screen.findByRole('tablist', { name: 'Partner sections' }))
    expect(await tabs.findByRole('tab', { name: 'Mail Notification' })).toBeInTheDocument()
  })

  it('shows the two recipient email fields', async () => {
    await openTab()

    expect(screen.getByRole('tab', { name: 'Mail Notification' })).toHaveAttribute('aria-selected', 'true')
    const lead = screen.getByLabelText('Lead Notification Recipient')
    const client = screen.getByLabelText('Client Notification Recipient')
    expect(lead).toHaveAttribute('type', 'email')
    expect(client).toHaveAttribute('type', 'email')

    await userEvent.type(lead, 'leads@pentagon.test')
    await userEvent.type(client, 'clients@pentagon.test')
    expect(lead).toHaveValue('leads@pentagon.test')
    expect(client).toHaveValue('clients@pentagon.test')
  })

  it("does not offer the page's Update button, which would not save these fields", async () => {
    await openTab()

    expect(screen.queryByRole('button', { name: /^Update$/ })).not.toBeInTheDocument()
  })

  it('opens from a link to the tab', async () => {
    signIn({ is_host: 1, permissions: ['view partners', 'update partners'] })
    allowBackgroundCalls()
    api('get', '/admin/partners-details/21', partner)
    renderPage(<PartnerProfile />, { path: '/partners/:id', route: '/partners/21?tab=mailNotification' })

    expect(await screen.findByLabelText('Lead Notification Recipient')).toBeInTheDocument()
  })

  it('cannot be opened while the partner is being created', async () => {
    signIn({ is_host: 1, permissions: ['view partners', 'create partners'] })
    allowBackgroundCalls()
    renderPage(<PartnerProfile />, { path: '/partners/create', route: '/partners/create' })

    const tab = await screen.findByRole('tab', { name: 'Mail Notification' })
    expect(tab).toHaveAttribute('aria-disabled', 'true')
  })
})
