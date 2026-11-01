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

// One person, two companies: the table must tell the applications apart.
const LONG_FUNDING_TYPE = 'Working Capital, Payroll, Inventory, Marketing, Expansion, Equipment, Ground-Up Development, Refinance Debt'
const RECENT_APPLICATIONS = [
  { id: 1, purpose_of_funds: LONG_FUNDING_TYPE, formatted_created_at: 'Oct 19, 2026', borrower: 'Michael Chen', business_name: 'Alpha Tech Solutions', entity_type: 'S-Corporation', requested_amount: 1000, total_funded_amount: 0, status: 'Pending' },
  { id: 2, purpose_of_funds: 'Business Acquisition', formatted_created_at: 'Oct 15, 2026', borrower: 'Michael Chen', business_name: 'Chen Logistics Inc', entity_type: 'LLC', requested_amount: 2000, total_funded_amount: 0, status: 'Approved' },
  { id: 3, purpose_of_funds: 'Payroll', formatted_created_at: 'Oct 07, 2026', borrower: 'Gonzalo Araiza', business_name: null, entity_type: 'LLC', requested_amount: 3000, total_funded_amount: 0, status: 'Pending' },
]

const mountWithApplications = () => {
  signIn({ first_name: 'Hosta' })
  useAuthStore.setState({ userSubscription: null } as never)
  allowBackgroundCalls()
  api('get', '/common/dashboard', { status: true, data: { latest_funding_applications: RECENT_APPLICATIONS } })
  return renderPage(<Dashboard />, { path: '/' })
}

const recentTable = async () => {
  const heading = await screen.findByText('Recent Funding Applications')
  return heading.closest('.card')!.querySelector('table') as HTMLTableElement
}

describe('Dashboard: Recent Funding Applications', () => {
  it('shows the Company Name next to the Borrower, in place of Entity Type', async () => {
    mountWithApplications()
    await screen.findByText('Alpha Tech Solutions')

    const headers = Array.from((await recentTable()).querySelectorAll('thead th')).map((th) => th.textContent?.trim())
    const borrower = headers.indexOf('Borrower')
    expect(borrower).toBeGreaterThanOrEqual(0)
    expect(headers[borrower + 1]).toBe('Company Name')
    expect(headers).not.toContain('Entity Type')
  })

  it("shows each application's own company, and a fallback when there is none", async () => {
    mountWithApplications()
    await screen.findByText('Alpha Tech Solutions')

    const rows = Array.from((await recentTable()).querySelectorAll('tbody tr'))
    expect(rows[0]).toHaveTextContent('Alpha Tech Solutions')
    expect(rows[1]).toHaveTextContent('Chen Logistics Inc')
    expect(rows[2]).toHaveTextContent('N/A')
  })

  it('keeps a long funding type to one short line, with the full text on hover', async () => {
    mountWithApplications()
    await screen.findByText('Alpha Tech Solutions')

    const cell = (await recentTable()).querySelector('tbody tr td') as HTMLElement
    const text = cell.querySelector('.text-truncate') as HTMLElement
    expect(text).not.toBeNull()
    expect(text).toHaveAttribute('title', LONG_FUNDING_TYPE)
    expect(text.style.maxWidth).toBe('260px')
  })
})

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

  it("shows the commission card in the viewer's terms - partner staff get their deals, not money", async () => {
    signIn({ is_host: 0, partner_id: 5, entity_type: 'Employee' })
    allowBackgroundCalls()
    api('get', '/common/dashboard', {
      status: true,
      data: { counts: { total_clients: 4, total_leads: 2, funding_application: 1 }, commission: { viewer: 'partner_staff', deals: 3, completed_deals: 1 } },
    })
    renderPage(<Dashboard />, { path: '/' })

    const card = (await screen.findByText('My Deals')).closest('.card') as HTMLElement
    expect(card).toHaveTextContent('3')
    expect(screen.queryByText('Total Commission')).not.toBeInTheDocument()
  })

  it('does not show the banner during an active free trial', async () => {
    mount({ is_host: 0, partner_id: 5 }, { is_host: false, is_free_trail: true, free_trail_end_date: '2999-01-01' })

    await screen.findByText(/^Welcome,/)
    expect(screen.queryByText(RESTRICTED)).not.toBeInTheDocument()
  })
})
