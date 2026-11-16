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
 * Partner profile › Commissions: the host sets the partner's Funding
 * commission tiers - its share (%) of the success fee by how many of its
 * clients' funding applications have been funded. The funding application's
 * split opens at the tier for that deal (fch-api PUT /admin/partners/{id}/commission).
 */
type Tier = { id?: number; min_count: number; max_count: number | null; commission_type?: 'percentage' | 'flat'; percentage: number | null; amount?: number | null }

const ONE_RATE: Tier[] = [{ id: 1, min_count: 0, max_count: null, percentage: 25 }]

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
    commission_tiers: ONE_RATE,
    funded_deal_count: 0,
    ...overrides,
  },
})

const saved = (tiers: Tier[], fundedDealCount = 0) => ({
  status: true,
  message: 'Partner commission updated successfully.',
  data: { id: 21, commission_tiers: tiers, funded_deal_count: fundedDealCount },
})

const MANAGER = ['view partners', 'update partners', 'view commission', 'update commission']

const openTab = async () => {
  renderPage(<PartnerProfile />, { path: '/partners/:id', route: '/partners/21' })
  await userEvent.click(await screen.findByRole('tab', { name: 'Commissions' }))
}

const rate = (n: number) => screen.getByLabelText(`Tier ${n} commission (%)`)
const saveButton = () => screen.getByRole('button', { name: /save commission/i })

describe('PartnerProfile - Commissions tab', () => {
  it("shows the partner's Funding tiers and the split its next deal gets", async () => {
    signIn({ is_host: 1, permissions: MANAGER })
    allowBackgroundCalls()
    api('get', '/admin/partners-details/21', partner())

    await openTab()

    await waitFor(() => expect(rate(1)).toHaveValue(25))
    expect(screen.getByLabelText('Tier 1 from')).toHaveValue(0)
    expect(screen.getByLabelText('Tier 1 to')).toHaveValue(null)
    // Funding only, percentage only: no payout type to pick.
    expect(screen.queryByLabelText('Tier 1 commission or flat amount')).not.toBeInTheDocument()
    expect(screen.getByTestId('commission-split-partner')).toHaveTextContent('25%')
    expect(screen.getByTestId('commission-split-admin')).toHaveTextContent('75%')
    // The tab saves itself: the page's generic Update button is not shown here.
    expect(screen.queryByRole('button', { name: /^Update$/ })).not.toBeInTheDocument()
  })

  it('saves new tiers', async () => {
    signIn({ is_host: 1, permissions: MANAGER })
    allowBackgroundCalls()
    api('get', '/admin/partners-details/21', partner())
    const sent = api('put', '/admin/partners/21/commission', saved([
      { id: 1, min_count: 0, max_count: 10, percentage: 25 },
      { id: 2, min_count: 11, max_count: null, percentage: 30 },
    ]))

    await openTab()
    await waitFor(() => expect(rate(1)).toHaveValue(25))
    await userEvent.type(screen.getByLabelText('Tier 1 to'), '10')
    await userEvent.click(screen.getByRole('button', { name: /add tier/i }))
    await userEvent.type(rate(2), '30')
    await userEvent.click(saveButton())

    await waitFor(() => expect(sent.bodies).toEqual([{ tiers: [
      { min_count: 0, max_count: 10, commission_type: 'percentage', percentage: 25 },
      { min_count: 11, max_count: null, commission_type: 'percentage', percentage: 30 },
    ] }]))
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Partner commission updated successfully.'))
  })

  it('tells the activity sidebar to reload once saved, so the "Commission updated" entry shows at once', async () => {
    signIn({ is_host: 1, permissions: MANAGER })
    allowBackgroundCalls()
    api('get', '/admin/partners-details/21', partner())
    api('put', '/admin/partners/21/commission', saved([{ id: 1, min_count: 0, max_count: null, percentage: 30 }]))
    const refreshed = vi.fn()
    window.addEventListener(REFRESH_ACTIVITIES_EVENT, refreshed)

    try {
      await openTab()
      await waitFor(() => expect(rate(1)).toHaveValue(25))
      await userEvent.clear(rate(1))
      await userEvent.type(rate(1), '30')
      expect(refreshed).not.toHaveBeenCalled()
      await userEvent.click(saveButton())

      await waitFor(() => expect(refreshed).toHaveBeenCalledTimes(1))
    } finally {
      window.removeEventListener(REFRESH_ACTIVITIES_EVENT, refreshed)
    }
  })

  it('saves from the top-right button, enabled only once a tier is changed', async () => {
    signIn({ is_host: 1, permissions: MANAGER })
    allowBackgroundCalls()
    api('get', '/admin/partners-details/21', partner())

    await openTab()
    await waitFor(() => expect(rate(1)).toHaveValue(25))
    const save = saveButton()
    // In the page header, where the other tabs keep their Update button.
    expect(save.closest('.page-actions')).not.toBeNull()
    expect(save).toBeDisabled()
    expect(screen.getByText('Current: 25%')).toBeInTheDocument()

    await userEvent.clear(rate(1))
    await userEvent.type(rate(1), '30')
    expect(save).toBeEnabled()
    expect(screen.getByText('Unsaved changes')).toBeInTheDocument()

    await userEvent.clear(rate(1))
    await userEvent.type(rate(1), '25')
    expect(save).toBeDisabled()
  })

  it("previews the split on a $10,000 success fee at the next deal's tier", async () => {
    signIn({ is_host: 1, permissions: MANAGER })
    allowBackgroundCalls()
    // 10 deals funded: the next one is #11, in the 11+ tier.
    api('get', '/admin/partners-details/21', partner({
      commission_tiers: [
        { id: 1, min_count: 0, max_count: 10, percentage: 10 },
        { id: 2, min_count: 11, max_count: null, percentage: 20 },
      ],
      funded_deal_count: 10,
    }))

    await openTab()
    await waitFor(() => expect(rate(2)).toHaveValue(20))
    expect(screen.getByText('Current: 2 tiers')).toBeInTheDocument()
    expect(screen.getByTestId('next-deal-tier')).toHaveTextContent('10 funded so far. Deal #11 falls in tier 2 (11+).')
    expect(screen.getByTestId('commission-split-partner')).toHaveTextContent('20%')
    expect(screen.getByTestId('preview-partner-payout')).toHaveTextContent('$2,000')
    expect(screen.getByTestId('preview-admin-payout')).toHaveTextContent('$8,000')

    await userEvent.clear(rate(2))
    await userEvent.type(rate(2), '40')

    expect(screen.getByTestId('preview-partner-payout')).toHaveTextContent('$4,000')
    expect(screen.getByTestId('preview-admin-payout')).toHaveTextContent('$6,000')
  })

  it('says when no commission is set and starts one blank tier from 0', async () => {
    signIn({ is_host: 1, permissions: MANAGER })
    allowBackgroundCalls()
    api('get', '/admin/partners-details/21', partner({ commission_tiers: [] }))

    await openTab()

    await waitFor(() => expect(screen.getByText('Not set')).toBeInTheDocument())
    expect(screen.getByLabelText('Tier 1 from')).toHaveValue(0)
    expect(rate(1)).toHaveValue(null)
    expect(screen.getByTestId('commission-split-admin')).toHaveTextContent('100%')
    expect(saveButton()).toBeDisabled()
  })

  it('cannot clear the commission: a blank rate is sent as missing and the API says so under it', async () => {
    signIn({ is_host: 1, permissions: MANAGER })
    allowBackgroundCalls()
    api('get', '/admin/partners-details/21', partner())
    const sent = api('put', '/admin/partners/21/commission', invalid({
      'tiers.0.percentage': 'Enter the commission (%) for this tier.',
    }), 422)

    await openTab()
    await waitFor(() => expect(rate(1)).toHaveValue(25))
    await userEvent.clear(rate(1))
    await userEvent.click(saveButton())

    await waitFor(() => expect(sent.bodies).toEqual([{ tiers: [{ min_count: 0, max_count: null, commission_type: 'percentage', percentage: null }] }]))
    expect(await screen.findByText('Enter the commission (%) for this tier.')).toBeInTheDocument()
    expect(rate(1)).toHaveClass('is-invalid')
  })

  it('fixes the first tier at 0', async () => {
    signIn({ is_host: 1, permissions: MANAGER })
    allowBackgroundCalls()
    api('get', '/admin/partners-details/21', partner())

    await openTab()

    await waitFor(() => expect(screen.getByLabelText('Tier 1 from')).toHaveValue(0))
    expect(screen.getByLabelText('Tier 1 from')).toHaveAttribute('readonly')
    expect(screen.getByRole('button', { name: 'Remove tier 1' })).toBeDisabled()
  })

  it("shows the API's error under the tier field it is about", async () => {
    signIn({ is_host: 1, permissions: MANAGER })
    allowBackgroundCalls()
    api('get', '/admin/partners-details/21', partner())
    api('put', '/admin/partners/21/commission', invalid({
      'tiers.0.percentage': 'Commission must be at most 99%. The admin keeps at least 1% of the success fee.',
    }), 422)

    await openTab()
    await waitFor(() => expect(rate(1)).toHaveValue(25))
    await userEvent.clear(rate(1))
    await userEvent.type(rate(1), '99.5')
    await userEvent.click(saveButton())

    expect(await screen.findByText('Commission must be at most 99%. The admin keeps at least 1% of the success fee.')).toBeInTheDocument()
    expect(rate(1)).toHaveClass('is-invalid')
  })

  it('is read-only without the update commission permission', async () => {
    signIn({ is_host: 1, permissions: ['view partners', 'update partners', 'view commission'] })
    allowBackgroundCalls()
    api('get', '/admin/partners-details/21', partner())

    await openTab()

    await waitFor(() => expect(rate(1)).toHaveValue(25))
    expect(rate(1)).toBeDisabled()
    expect(screen.queryByRole('button', { name: /add tier/i })).not.toBeInTheDocument()
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

  // Each tier has its own commission type, picked in the row's dropdown.
  describe('commission type per tier', () => {
    const typeOf = (n: number) => screen.getByRole('button', { name: `Tier ${n} commission type` })
    const amount = (n: number) => screen.getByLabelText(`Tier ${n} commission ($)`)
    const pick = async (n: number, label: string) => {
      await userEvent.click(typeOf(n))
      await userEvent.click(screen.getByRole('button', { name: label }))
    }
    const MIXED = {
      commission_tiers: [
        { id: 1, min_count: 0, max_count: 10, commission_type: 'flat', percentage: null, amount: 500 },
        { id: 2, min_count: 11, max_count: null, commission_type: 'percentage', percentage: 15, amount: null },
      ],
      funded_deal_count: 0,
    }

    it("shows each tier's type and value", async () => {
      signIn({ is_host: 1, permissions: MANAGER })
      allowBackgroundCalls()
      api('get', '/admin/partners-details/21', partner(MIXED))

      await openTab()

      await waitFor(() => expect(amount(1)).toHaveValue(500))
      expect(typeOf(1)).toHaveTextContent('Flat Amount')
      expect(typeOf(2)).toHaveTextContent('Percentage')
      expect(rate(2)).toHaveValue(15)
      expect(saveButton()).toBeDisabled()
    })

    it('saves a tier switched to a flat amount, each tier with its own type', async () => {
      signIn({ is_host: 1, permissions: MANAGER })
      allowBackgroundCalls()
      api('get', '/admin/partners-details/21', partner())
      const sent = api('put', '/admin/partners/21/commission', saved([
        { id: 1, min_count: 0, max_count: 10, commission_type: 'flat', percentage: null, amount: 500 },
        { id: 2, min_count: 11, max_count: null, commission_type: 'percentage', percentage: 30, amount: null },
      ]))

      await openTab()
      await waitFor(() => expect(rate(1)).toHaveValue(25))
      await pick(1, 'Flat Amount')
      expect(screen.queryByLabelText('Tier 1 commission (%)')).not.toBeInTheDocument()
      expect(saveButton()).toBeEnabled()
      await userEvent.type(amount(1), '500')
      await userEvent.type(screen.getByLabelText('Tier 1 to'), '10')
      await userEvent.click(screen.getByRole('button', { name: /add tier/i }))
      await userEvent.type(rate(2), '30')
      await userEvent.click(saveButton())

      await waitFor(() => expect(sent.bodies).toEqual([{ tiers: [
        { min_count: 0, max_count: 10, commission_type: 'flat', amount: 500 },
        { min_count: 11, max_count: null, commission_type: 'percentage', percentage: 30 },
      ] }]))
      await waitFor(() => expect(screen.getByText('Current: 2 tiers')).toBeInTheDocument())
    })

    it("previews a flat tier's split on a $10,000 success fee", async () => {
      signIn({ is_host: 1, permissions: MANAGER })
      allowBackgroundCalls()
      api('get', '/admin/partners-details/21', partner({
        commission_tiers: [{ id: 1, min_count: 0, max_count: null, commission_type: 'flat', percentage: null, amount: 500 }],
      }))

      await openTab()

      await waitFor(() => expect(amount(1)).toHaveValue(500))
      expect(screen.getByText('Current: $500')).toBeInTheDocument()
      expect(screen.getByTestId('commission-split-partner')).toHaveTextContent('5%')
      expect(screen.getByTestId('preview-partner-payout')).toHaveTextContent('$500')
      expect(screen.getByTestId('preview-admin-payout')).toHaveTextContent('$9,500')
    })

    it('switching a tier back to its saved type is not a change', async () => {
      signIn({ is_host: 1, permissions: MANAGER })
      allowBackgroundCalls()
      api('get', '/admin/partners-details/21', partner())

      await openTab()
      await waitFor(() => expect(rate(1)).toHaveValue(25))
      await pick(1, 'Flat Amount')
      await pick(1, 'Percentage')

      expect(rate(1)).toHaveValue(25)
      expect(saveButton()).toBeDisabled()
    })

    it("shows the API's error under the amount it is about", async () => {
      signIn({ is_host: 1, permissions: MANAGER })
      allowBackgroundCalls()
      api('get', '/admin/partners-details/21', partner(MIXED))
      const sent = api('put', '/admin/partners/21/commission', invalid({
        'tiers.0.amount': 'Enter the commission amount ($) for this tier.',
      }), 422)

      await openTab()
      await waitFor(() => expect(amount(1)).toHaveValue(500))
      await userEvent.clear(amount(1))
      await userEvent.click(saveButton())

      await waitFor(() => expect(sent.bodies).toEqual([{ tiers: [
        { min_count: 0, max_count: 10, commission_type: 'flat', amount: null },
        { min_count: 11, max_count: null, commission_type: 'percentage', percentage: 15 },
      ] }]))
      expect(await screen.findByText('Enter the commission amount ($) for this tier.')).toBeInTheDocument()
      expect(amount(1)).toHaveClass('is-invalid')
    })

    it('is read-only without the update commission permission', async () => {
      signIn({ is_host: 1, permissions: ['view partners', 'update partners', 'view commission'] })
      allowBackgroundCalls()
      api('get', '/admin/partners-details/21', partner(MIXED))

      await openTab()

      await waitFor(() => expect(amount(1)).toHaveValue(500))
      expect(typeOf(1)).toBeDisabled()
    })
  })
})
