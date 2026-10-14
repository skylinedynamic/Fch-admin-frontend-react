import { beforeEach, describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { screen, waitFor } from '../../test-utils'
import { allowBackgroundCalls, api, renderPage, signIn, type TestUser } from '../pageHarness'
import { useAuthStore } from '../../../src/store/auth'

vi.mock('react-toastify', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-toastify')>()
  return { ...actual, toast: Object.assign(vi.fn(), { info: vi.fn(), success: vi.fn(), error: vi.fn(), warn: vi.fn() }) }
})
vi.mock('bootstrap/js/dist/modal', () => import('../../mocks/fakeBootstrapModal'))
vi.mock('../../../src/hooks/useSummernote', () => ({ useSummernote: () => ({ editorRef: () => {} }) }))

import Dashboard from '../../../src/pages/dashboard/Dashboard'

const RESTRICTED = 'Account Restricted: Pending Invoice or Expired Subscription'

const mount = (user: TestUser = {}, subscription: Record<string, unknown> | null = null) => {
  signIn(user)
  useAuthStore.setState({ userSubscription: subscription } as never)
  allowBackgroundCalls()
  const dashboard = api('get', '/common/dashboard', { status: true, data: {} })
  const view = renderPage(<Dashboard />, { path: '/' })
  return { dashboard, ...view }
}

beforeEach(() => vi.clearAllMocks())

describe('Dashboard', () => {
  it('greets the user by first name and loads the dashboard data', async () => {
    const { dashboard } = mount({ first_name: 'Hosta' })

    expect(await screen.findByText('Welcome, Hosta!')).toBeInTheDocument()
    await waitFor(() => expect(dashboard.calls).toBe(1))
  })

  // The login API sends `name` only, no `first_name`.
  it('greets a user from the login response by the first word of their name', async () => {
    mount({ name: 'Craig Rice' })

    expect(await screen.findByText('Welcome, Craig!')).toBeInTheDocument()
  })

  it('falls back to a generic greeting when there is no name', async () => {
    mount({ name: '' })

    expect(await screen.findByText('Welcome, User!')).toBeInTheDocument()
  })

  it('shows no restriction banner to the host', async () => {
    mount({}, { is_host: true, subscription_status: 'Expired', subscription_end_date: '2020-01-01' })

    await screen.findByText(/^Welcome,/)
    expect(screen.queryByText(RESTRICTED)).not.toBeInTheDocument()
  })

  it('shows no restriction banner for an active subscription', async () => {
    mount({ is_host: 0, partner_id: 5 }, { is_host: false, subscription_status: 'Active', subscription_end_date: '2999-01-01' })

    await screen.findByText(/^Welcome,/)
    expect(screen.queryByText(RESTRICTED)).not.toBeInTheDocument()
  })

  it('warns a partner whose subscription has lapsed and points them to their invoices', async () => {
    const user = userEvent.setup()
    mount({ is_host: 0, partner_id: 5 }, { is_host: false, subscription_status: 'Active', subscription_end_date: '2020-01-01' })

    expect(await screen.findByText(RESTRICTED)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /view & pay invoices/i }))

    expect(await screen.findByTestId('landing')).toHaveTextContent('navigated:/invoices')
  })

  it('warns a partner whose subscription is in an unpaid state', async () => {
    mount({ is_host: 0, partner_id: 5 }, { is_host: false, subscription_status: 'Pending', subscription_end_date: '2999-01-01' })

    expect(await screen.findByText(RESTRICTED)).toBeInTheDocument()
  })

  it('does not show the banner during an active free trial', async () => {
    mount({ is_host: 0, partner_id: 5 }, { is_host: false, is_free_trail: true, free_trail_end_date: '2999-01-01' })

    await screen.findByText(/^Welcome,/)
    expect(screen.queryByText(RESTRICTED)).not.toBeInTheDocument()
  })
})
