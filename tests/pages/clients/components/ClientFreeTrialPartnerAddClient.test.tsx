import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { act, screen } from '@testing-library/react'
import { renderWithProviders } from '../../../test-utils'
import { server } from '../../../mocks/server'
import { useAuthStore } from '../../../../src/store/auth'
import { PARTNER_TYPES } from '../../../../src/config/partnerTypeOptions'
import ClientInfoSection from '../../../../src/pages/clients/components/ClientInfoSection'

vi.mock('react-toastify', () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), info: vi.fn(), warn: vi.fn() }) }))
vi.mock('bootstrap/js/dist/modal', () => import('../../../mocks/fakeBootstrapModal'))
vi.mock('../../../../src/hooks/useSummernote', () => ({ useSummernote: () => ({ editorRef: () => {} }) }))

/**
 * BUG-142: a partner on a free trial could add a paid client through Add
 * Client. The form turned the Limited Free Plan on only if the partner's
 * subscription was already loaded when it opened; it is fetched after the page
 * loads, so on a fresh load the switch stayed off - and locked - with the paid
 * Enrollment Type open below it. The switch now turns on whenever the trial is
 * known, as Convert Lead does, and the API's "Paid Version" answer shows under it.
 */
const PARTNER = { id: 9, entity_type: 'Partner', partner_id: 9, is_host: 0, partner_type: PARTNER_TYPES.CERTIFIED, permissions: [] }
const TRIAL = { is_free_trail: true, free_trail_end_date: '2026-11-28' }

beforeEach(() => {
  useAuthStore.setState({ user: PARTNER, userSubscription: null } as never)
  server.use(http.all('*', () => HttpResponse.json({ status: true, data: [] })))
})
afterEach(() => server.resetHandlers())

const renderAddClient = (errors: Record<string, string> = {}) =>
  renderWithProviders(<ClientInfoSection countries={[]} states={[]} cities={[]} errors={errors} setErrors={() => {}} />)

describe('Add Client, a partner on a free trial', () => {
  it('turns the Limited Free Plan on and hides the paid enrollment once the trial is known, even if it loads late', async () => {
    renderAddClient()

    const freePlan = await screen.findByRole('checkbox', { name: 'Activate Limited Free Plan' })
    expect(freePlan).not.toBeChecked()

    // The subscription arrives after the form opened, as on a fresh page load.
    act(() => useAuthStore.setState({ userSubscription: TRIAL } as never))

    expect(await screen.findByRole('checkbox', { name: 'Activate Limited Free Plan' })).toBeChecked()
    expect(screen.queryByText(/Enrollment Type/)).not.toBeInTheDocument()
  })

  it('shows the API saying a paid client needs the Paid Version under the switch', async () => {
    useAuthStore.setState({ userSubscription: TRIAL } as never)
    const message = 'Paid clients are only available in the Paid Version. Upgrade your plan to add a paid client, or add this client on the Limited Free Plan.'

    renderAddClient({ is_free_trail: message })

    expect(await screen.findByText(message)).toBeInTheDocument()
  })

  it('leaves the switch off for a partner not on a trial', async () => {
    useAuthStore.setState({ userSubscription: { is_free_trail: false } } as never)

    renderAddClient()

    expect(await screen.findByRole('checkbox', { name: 'Activate Limited Free Plan' })).not.toBeChecked()
  })
})
