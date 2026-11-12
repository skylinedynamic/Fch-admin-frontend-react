import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import userEvent from '@testing-library/user-event'
import { allowBackgroundCalls, api, paginated, renderPage, signIn, signOut } from '../../pageHarness'
import { PARTNER_OPTIONS, dropdownLabels, dropdownShowing, searchDropdown } from '../../../mocks/partnerOptions'
import { screen, waitFor } from '../../../test-utils'
import { server } from '../../../mocks/server'
import FundingApplication from '../../../../src/pages/applications/funding/FundingApplication'

/**
 * Host > Intake & Review > Funding Application: the host sees whose client
 * each application is (PARTNER NAME) and narrows the list to one partner -
 * from the Partner dropdown (`partner_id`) or by typing in the PARTNER NAME
 * column (`filters.partner_name`). A partner sees only its own applications,
 * so it gets neither, and the host-only partner list is never asked for.
 */
const LIST = '/common/request-application/funding-application'
const ROWS = [
  { id: 1, full_name: 'Constatine Jhnson', business_name: 'Inc', application_number: 'FUND-001', partner_name: 'Wanda Wells', industry_type: 'Retail', purpose_of_funds: 'Payroll', requested_amount: '$1,000.00', date: '08 Nov 2026', status: 'Draft' },
  { id: 2, full_name: 'Michael Chen', business_name: 'Alpha Tech', application_number: 'FUND-002', partner_name: 'Hal Host', industry_type: 'Media', purpose_of_funds: 'Marketing', requested_amount: '$2,000.00', date: '05 Nov 2026', status: 'Pending' },
]

const mount = (isHost = true) => {
  signIn({ is_host: isHost ? 1 : 0, permissions: ['view funding applications'] })
  allowBackgroundCalls()
  const options = api('post', '/common/get-all-partners', { status: true, message: 'ok', data: PARTNER_OPTIONS })
  const list = api('post', LIST, paginated(ROWS))
  const user = userEvent.setup()
  const view = renderPage(<FundingApplication />, { path: '/intake-review/funding-application' })
  return { options, list, user, ...view }
}

const lastBody = (list: { bodies: any[] }) => list.bodies[list.bodies.length - 1]

describe('Funding Application › partner', () => {
  beforeEach(() => server.resetHandlers())
  afterEach(() => signOut())

  it("shows each application's partner to the host", async () => {
    mount()

    expect(await screen.findByText('Wanda Wells')).toBeInTheDocument()
    expect(screen.getByText('Hal Host')).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /partner name/i })).toBeInTheDocument()
  })

  it('lists every partner in the Partner dropdown, searchable', async () => {
    const { user, options } = mount()
    await screen.findByText('Wanda Wells')

    const labels = await dropdownLabels(user, await dropdownShowing('All Partners'))
    expect(labels).toEqual(['All Partners', ...PARTNER_OPTIONS.map((p) => `${p.company_name} (${p.full_name})`)])
    expect(options.calls).toBe(1)

    await user.keyboard('{Escape}')
    expect(await searchDropdown(user, await dropdownShowing('All Partners'), 'Company 12')).toEqual(['Company 12 (Partner 12)'])
  })

  it('sends the picked partner when Filters is clicked, and Clear drops it', async () => {
    const { user, list } = mount()
    await screen.findByText('Wanda Wells')

    await dropdownLabels(user, await dropdownShowing('All Partners'))
    await user.click(Array.from(document.body.querySelectorAll('.p-dropdown-item')).find((el) => el.textContent === 'Company 03 (Partner 03)') as HTMLElement)
    await user.click(screen.getByRole('button', { name: /filters/i }))
    await waitFor(() => expect(lastBody(list)).toMatchObject({ partner_id: 3, page: 1 }))

    await user.click(screen.getByRole('button', { name: /clear/i }))
    await waitFor(() => expect(lastBody(list).partner_id ?? '').toBe(''))
    expect(await dropdownShowing('All Partners')).toBeInTheDocument()
  })

  it('sends what is typed in the Partner Name column filter', async () => {
    const { user, list } = mount()
    await screen.findByText('Wanda Wells')

    const header = screen.getByRole('columnheader', { name: /partner name/i })
    await user.click(header.querySelector('.p-column-filter-menu-button') as HTMLElement)
    await user.type(await screen.findByPlaceholderText('Search partner'), 'Wanda')
    await user.click(Array.from(document.body.querySelectorAll('.p-column-filter-overlay button')).find((b) => b.textContent === 'Apply') as HTMLElement)

    await waitFor(() => expect(lastBody(list)?.filters?.partner_name?.constraints?.[0]?.value).toBe('Wanda'))
  })

  it('gives a partner neither the column nor the dropdown, and never asks for the partner list', async () => {
    const { options } = mount(false)
    await screen.findByText('Constatine Jhnson')

    expect(screen.queryByRole('columnheader', { name: /partner name/i })).not.toBeInTheDocument()
    expect(screen.queryByText('Wanda Wells')).not.toBeInTheDocument()
    expect(Array.from(document.querySelectorAll('.p-dropdown-label')).map((el) => el.textContent)).not.toContain('All Partners')
    expect(options.calls).toBe(0)
  })
})
