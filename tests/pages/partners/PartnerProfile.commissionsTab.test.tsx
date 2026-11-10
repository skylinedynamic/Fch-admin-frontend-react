import { describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { toast } from 'react-toastify'
import { screen, waitFor } from '../../test-utils'
import { allowBackgroundCalls, api, invalid, renderPage, signIn } from '../pageHarness'
import { REFRESH_ACTIVITIES_EVENT } from '../../../src/config/appConfig'

vi.mock('react-toastify', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-toastify')>()
  return { ...actual, toast: Object.assign(vi.fn(), { info: vi.fn(), success: vi.fn(), error: vi.fn(), warn: vi.fn() }) }
})
vi.mock('bootstrap/js/dist/modal', () => import('../../mocks/fakeBootstrapModal'))
vi.mock('../../../src/hooks/useSummernote', () => ({ useSummernote: () => ({ editorRef: () => {} }) }))

import PartnerProfile from '../../../src/pages/partners/PartnerProfile'

/**
 * Partner profile › Commissions: the host sets the partner's commission - its
 * share (%) of the success fee - which the funding application's commission
 * split opens at (fch-api PUT /admin/partners/{id}/commission).
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
    commission: 25,
    ...overrides,
  },
})

const MANAGER = ['view partners', 'update partners', 'view commission', 'update commission']

const openTab = async () => {
  renderPage(<PartnerProfile />, { path: '/partners/:id', route: '/partners/21' })
  await userEvent.click(await screen.findByRole('tab', { name: 'Commissions' }))
}

const rateInput = () => screen.getByLabelText('Partner Commission (%)')

describe('PartnerProfile - Commissions tab', () => {
  it("shows the partner's commission and the split it gives", async () => {
    signIn({ is_host: 1, permissions: MANAGER })
    allowBackgroundCalls()
    api('get', '/admin/partners-details/21', partner())

    await openTab()

    await waitFor(() => expect(rateInput()).toHaveValue(25))
    expect(screen.getByTestId('commission-split-partner')).toHaveTextContent('25%')
    expect(screen.getByTestId('commission-split-admin')).toHaveTextContent('75%')
    // The tab saves itself: the page's generic Update button is not shown here.
    expect(screen.queryByRole('button', { name: /^Update$/ })).not.toBeInTheDocument()
  })

  it('saves a new commission', async () => {
    signIn({ is_host: 1, permissions: MANAGER })
    allowBackgroundCalls()
    api('get', '/admin/partners-details/21', partner())
    const sent = api('put', '/admin/partners/21/commission', { status: true, message: 'Partner commission updated successfully.', data: { id: 21, commission: 30 } })

    await openTab()
    await waitFor(() => expect(rateInput()).toHaveValue(25))
    await userEvent.clear(rateInput())
    await userEvent.type(rateInput(), '30')

    expect(screen.getByTestId('commission-split-admin')).toHaveTextContent('70%')

    await userEvent.click(screen.getByRole('button', { name: /save commission/i }))

    await waitFor(() => expect(sent.bodies).toEqual([{ commission: 30 }]))
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Partner commission updated successfully.'))
  })

  it('tells the activity sidebar to reload once saved, so the "Commission updated" entry shows at once', async () => {
    signIn({ is_host: 1, permissions: MANAGER })
    allowBackgroundCalls()
    api('get', '/admin/partners-details/21', partner())
    api('put', '/admin/partners/21/commission', { status: true, message: 'ok', data: { id: 21, commission: 30 } })
    const refreshed = vi.fn()
    window.addEventListener(REFRESH_ACTIVITIES_EVENT, refreshed)

    try {
      await openTab()
      await waitFor(() => expect(rateInput()).toHaveValue(25))
      await userEvent.clear(rateInput())
      await userEvent.type(rateInput(), '30')
      expect(refreshed).not.toHaveBeenCalled()
      await userEvent.click(screen.getByRole('button', { name: /save commission/i }))

      await waitFor(() => expect(refreshed).toHaveBeenCalledTimes(1))
    } finally {
      window.removeEventListener(REFRESH_ACTIVITIES_EVENT, refreshed)
    }
  })

  it('saves from the top-right button, enabled only once the rate is changed', async () => {
    signIn({ is_host: 1, permissions: MANAGER })
    allowBackgroundCalls()
    api('get', '/admin/partners-details/21', partner())

    await openTab()
    await waitFor(() => expect(rateInput()).toHaveValue(25))
    const save = screen.getByRole('button', { name: /save commission/i })
    // In the page header, where the other tabs keep their Update button.
    expect(save.closest('.page-actions')).not.toBeNull()
    expect(save).toBeDisabled()
    expect(screen.getByText('Current: 25%')).toBeInTheDocument()

    await userEvent.clear(rateInput())
    await userEvent.type(rateInput(), '30')
    expect(save).toBeEnabled()
    expect(screen.getByText('Unsaved changes')).toBeInTheDocument()

    await userEvent.clear(rateInput())
    await userEvent.type(rateInput(), '25')
    expect(save).toBeDisabled()
  })

  it('shows the split on a $10,000 success fee as the rate is typed', async () => {
    signIn({ is_host: 1, permissions: MANAGER })
    allowBackgroundCalls()
    api('get', '/admin/partners-details/21', partner())

    await openTab()
    await waitFor(() => expect(rateInput()).toHaveValue(25))
    expect(screen.getByTestId('preview-partner-payout')).toHaveTextContent('$2,500')
    expect(screen.getByTestId('preview-admin-payout')).toHaveTextContent('$7,500')

    await userEvent.clear(rateInput())
    await userEvent.type(rateInput(), '40')

    expect(screen.getByTestId('commission-split-partner')).toHaveTextContent('40%')
    expect(screen.getByTestId('preview-partner-payout')).toHaveTextContent('$4,000')
    expect(screen.getByTestId('preview-admin-payout')).toHaveTextContent('$6,000')
  })

  it('says when no commission is set', async () => {
    signIn({ is_host: 1, permissions: MANAGER })
    allowBackgroundCalls()
    api('get', '/admin/partners-details/21', partner({ commission: null }))

    await openTab()

    await waitFor(() => expect(screen.getByText('Not set')).toBeInTheDocument())
    expect(rateInput()).toHaveValue(null)
    expect(screen.getByTestId('commission-split-admin')).toHaveTextContent('100%')
  })

  it('clears the commission when left blank', async () => {
    signIn({ is_host: 1, permissions: MANAGER })
    allowBackgroundCalls()
    api('get', '/admin/partners-details/21', partner())
    const sent = api('put', '/admin/partners/21/commission', { status: true, message: 'ok', data: { id: 21, commission: null } })

    await openTab()
    await waitFor(() => expect(rateInput()).toHaveValue(25))
    await userEvent.clear(rateInput())
    await userEvent.click(screen.getByRole('button', { name: /save commission/i }))

    await waitFor(() => expect(sent.bodies).toEqual([{ commission: null }]))
  })

  it('refuses a commission above 99% before sending it', async () => {
    signIn({ is_host: 1, permissions: MANAGER })
    allowBackgroundCalls()
    api('get', '/admin/partners-details/21', partner())
    const sent = api('put', '/admin/partners/21/commission', { status: true, message: 'ok', data: { id: 21, commission: 99.5 } })

    await openTab()
    await waitFor(() => expect(rateInput()).toHaveValue(25))
    await userEvent.clear(rateInput())
    await userEvent.type(rateInput(), '99.5')
    await userEvent.click(screen.getByRole('button', { name: /save commission/i }))

    expect(await screen.findByText('Commission must be between 0% and 99%. The admin keeps at least 1% of the success fee.')).toBeInTheDocument()
    expect(sent.calls).toBe(0)
  })

  it('shows the error the API sends back', async () => {
    signIn({ is_host: 1, permissions: MANAGER })
    allowBackgroundCalls()
    api('get', '/admin/partners-details/21', partner())
    api('put', '/admin/partners/21/commission', invalid({ commission: 'Commission must be a number.' }), 422)

    await openTab()
    await waitFor(() => expect(rateInput()).toHaveValue(25))
    await userEvent.clear(rateInput())
    await userEvent.type(rateInput(), '40')
    await userEvent.click(screen.getByRole('button', { name: /save commission/i }))

    expect(await screen.findByText('Commission must be a number.')).toBeInTheDocument()
  })

  it('is read-only without the update commission permission', async () => {
    signIn({ is_host: 1, permissions: ['view partners', 'update partners', 'view commission'] })
    allowBackgroundCalls()
    api('get', '/admin/partners-details/21', partner())

    await openTab()

    await waitFor(() => expect(rateInput()).toHaveValue(25))
    expect(rateInput()).toBeDisabled()
    expect(screen.queryByRole('button', { name: /save commission/i })).not.toBeInTheDocument()
  })

  it('is not shown without the view commission permission', async () => {
    signIn({ is_host: 1, permissions: ['view partners', 'update partners'] })
    allowBackgroundCalls()
    const details = api('get', '/admin/partners-details/21', partner())

    renderPage(<PartnerProfile />, { path: '/partners/:id', route: '/partners/21' })

    await waitFor(() => expect(details.calls).toBe(1))
    await waitFor(() => expect(screen.getAllByRole('tab').length).toBeGreaterThan(0))
    expect(screen.queryByRole('tab', { name: 'Commissions' })).not.toBeInTheDocument()
  })

  it("is not shown on the host's own profile - the admin keeps the whole fee", async () => {
    signIn({ is_host: 1, permissions: MANAGER })
    allowBackgroundCalls()
    const details = api('get', '/admin/partners-details/21', partner({ is_host: true }))

    renderPage(<PartnerProfile />, { path: '/partners/:id', route: '/partners/21' })

    await waitFor(() => expect(details.calls).toBe(1))
    await waitFor(() => expect(screen.getAllByRole('tab').length).toBeGreaterThan(0))
    expect(screen.queryByRole('tab', { name: 'Commissions' })).not.toBeInTheDocument()
  })
})
