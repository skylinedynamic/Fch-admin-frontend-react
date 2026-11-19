import { describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { toast } from 'react-toastify'
import { screen, waitFor, within } from '../../test-utils'
import { allowBackgroundCalls, api, invalid, renderPage, signIn } from '../pageHarness'

vi.mock('react-toastify', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-toastify')>()
  return { ...actual, toast: Object.assign(vi.fn(), { info: vi.fn(), success: vi.fn(), error: vi.fn(), warn: vi.fn() }) }
})
vi.mock('bootstrap/js/dist/modal', () => import('../../mocks/fakeBootstrapModal'))
vi.mock('../../../src/hooks/useSummernote', () => ({ useSummernote: () => ({ editorRef: () => {} }) }))

import PartnerProfile from '../../../src/pages/partners/PartnerProfile'

/**
 * Partner profile › Mail Notification: where this partner's lead and client
 * notification emails go (fch-api /admin/partners/{id}/mail-notification).
 * The fields come from the API - one per notification type - and an empty one
 * sends that email to the partner's own address.
 */
const partner = {
  status: true,
  message: 'ok',
  data: { id: 21, user_id: 77, company_name: 'Pentagon Funding Group', email: 'owner@pentagon.test', partner_type: 'White-Label Partner (WL)', is_host: false, has_sign: false },
}

const recipients = (leads: string | null = null, clients: string | null = null) => ({
  status: true,
  message: 'ok',
  data: [
    { type: 'leads', label: 'Lead Notification Recipient', help: 'Gets the email sent when a lead is created.', email: leads },
    { type: 'clients', label: 'Client Notification Recipient', help: 'Gets the email sent when a client is added.', email: clients },
  ],
})

const openTab = async (saved = recipients()) => {
  signIn({ is_host: 1, permissions: ['view partners', 'update partners'] })
  allowBackgroundCalls()
  api('get', '/admin/partners-details/21', partner)
  api('get', '/admin/partners/21/mail-notification', saved)
  renderPage(<PartnerProfile />, { path: '/partners/:id', route: '/partners/21?tab=mailNotification' })
  await screen.findByLabelText('Lead Notification Recipient')
}

const saveButton = () => screen.getByRole('button', { name: /save mail notification/i })

describe('PartnerProfile - Mail Notification tab', () => {
  it('lists Mail Notification among the partner tabs', async () => {
    await openTab()

    const tabs = within(screen.getByRole('tablist', { name: 'Partner sections' }))
    expect(tabs.getByRole('tab', { name: 'Mail Notification' })).toHaveAttribute('aria-selected', 'true')
  })

  it('shows one email field per notification type, filled with what is saved', async () => {
    await openTab(recipients('leads@pentagon.test', null))

    const lead = screen.getByLabelText('Lead Notification Recipient')
    const client = screen.getByLabelText('Client Notification Recipient')
    expect(lead).toHaveAttribute('type', 'email')
    expect(lead).toHaveValue('leads@pentagon.test')
    expect(client).toHaveValue('')
    expect(screen.getByText('Gets the email sent when a lead is created.')).toBeInTheDocument()
    // Empty means the partner's own address: say which.
    expect(screen.getAllByText(/owner@pentagon\.test/).length).toBeGreaterThan(0)
  })

  it('saves the recipients - an emptied one as null - and confirms it', async () => {
    await openTab(recipients('leads@pentagon.test', null))
    const sent = api('put', '/admin/partners/21/mail-notification', { ...recipients(null, 'clients@pentagon.test'), message: 'Mail notification recipients updated successfully.' })

    await userEvent.clear(screen.getByLabelText('Lead Notification Recipient'))
    await userEvent.type(screen.getByLabelText('Client Notification Recipient'), 'clients@pentagon.test')
    await userEvent.click(saveButton())

    await waitFor(() => expect(sent.bodies).toEqual([{ recipients: { leads: null, clients: 'clients@pentagon.test' } }]))
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Mail notification recipients updated successfully.'))
    await waitFor(() => expect(saveButton()).toBeDisabled())
  })

  it('keeps Save off until something is changed', async () => {
    await openTab(recipients('leads@pentagon.test', null))

    expect(saveButton()).toBeDisabled()
    await userEvent.type(screen.getByLabelText('Client Notification Recipient'), 'x@pentagon.test')
    expect(saveButton()).toBeEnabled()
  })

  it('shows a refused address under its own field, not in a toast', async () => {
    await openTab()
    api('put', '/admin/partners/21/mail-notification', invalid({ 'recipients.leads': 'The Lead Notification Recipient field must be a valid email address.' }), 422)

    await userEvent.type(screen.getByLabelText('Lead Notification Recipient'), 'leads@pentagon')
    await userEvent.click(saveButton())

    expect(await screen.findByText('The Lead Notification Recipient field must be a valid email address.')).toBeInTheDocument()
    expect(screen.getByLabelText('Lead Notification Recipient')).toHaveClass('is-invalid')
    expect(toast.error).not.toHaveBeenCalled()
  })

  it("does not offer the page's Update button on this tab", async () => {
    await openTab()

    expect(screen.queryByRole('button', { name: /^Update$/ })).not.toBeInTheDocument()
  })

  it('cannot be opened while the partner is being created', async () => {
    signIn({ is_host: 1, permissions: ['view partners', 'create partners'] })
    allowBackgroundCalls()
    renderPage(<PartnerProfile />, { path: '/partners/create', route: '/partners/create' })

    expect(await screen.findByRole('tab', { name: 'Mail Notification' })).toBeDisabled()
  })
})
