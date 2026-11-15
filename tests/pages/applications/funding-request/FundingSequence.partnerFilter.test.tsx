import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import userEvent from '@testing-library/user-event'
import { allowBackgroundCalls, api, paginated, renderPage, signIn, signOut } from '../../pageHarness'
import { PARTNER_OPTIONS, dropdownLabels, dropdownShowing, searchDropdown } from '../../../mocks/partnerOptions'
import { screen, waitFor } from '../../../test-utils'
import { server } from '../../../mocks/server'
import FundingSequence from '../../../../src/pages/applications/funding-request/FundingSequence'

/**
 * Host > Intake & Review > Funding Request: the PARTNER NAME column can be
 * searched, and a Partner dropdown narrows the list to one partner
 * (`partner_id`). The column's filter used to go nowhere: the page never sent
 * its column filters. A partner sees only its own requests, so it gets
 * neither, and the host-only partner list is never asked for.
 */
const LIST = '/common/funding-request'
const ROWS = [
  { id: 11, borrower: { first_name: 'Amy', last_name: 'Zed' }, partner: { full_name: 'Wanda Wells' }, funding_sequence: { name: 'Working Capital' }, funding_type: 'Bridge', requested_amount: 1000, status: 'Pending' },
  { id: 12, borrower: { first_name: 'Bob', last_name: 'Young' }, partner: { full_name: 'Hal Host' }, funding_sequence: { name: 'Equipment' }, funding_type: 'Equipment', requested_amount: 2000, status: 'Approved' },
]

const mount = (isHost = true) => {
  signIn({ is_host: isHost ? 1 : 0, permissions: ['view funding requests'] })
  allowBackgroundCalls()
  const options = api('post', '/common/get-all-partners', { status: true, message: 'ok', data: PARTNER_OPTIONS })
  const list = api('post', LIST, paginated(ROWS, { funding_types: [] }))
  const user = userEvent.setup()
  const view = renderPage(<FundingSequence />, { path: '/intake-review/funding-request' })
  return { options, list, user, ...view }
}

const lastBody = (list: { bodies: any[] }) => list.bodies[list.bodies.length - 1]

describe('Funding Request › partner', () => {
  beforeEach(() => server.resetHandlers())
  afterEach(() => signOut())

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
    await user.click(Array.from(document.body.querySelectorAll('.p-dropdown-item')).find((el) => el.textContent === 'Company 05 (Partner 05)') as HTMLElement)
    await user.click(screen.getByRole('button', { name: /filters/i }))
    await waitFor(() => expect(lastBody(list)).toMatchObject({ partner_id: 5, page: 1 }))

    await user.click(screen.getByRole('button', { name: /clear/i }))
    await waitFor(() => expect(lastBody(list).partner_id ?? '').toBe(''))
    expect(await dropdownShowing('All Partners')).toBeInTheDocument()
  })

  it('sends what is typed in the Partner Name column filter', async () => {
    const { user, list } = mount()
    await screen.findByText('Wanda Wells')

    const header = screen.getByRole('columnheader', { name: /partner name/i })
    await user.click(header.querySelector('.p-column-filter-menu-button') as HTMLElement)
    await user.type(await screen.findByPlaceholderText('Search partner'), 'Wells')
    await user.click(Array.from(document.body.querySelectorAll('.p-column-filter-overlay button')).find((b) => b.textContent === 'Apply') as HTMLElement)

    await waitFor(() => expect(lastBody(list)?.filters?.partner_name?.constraints?.[0]?.value).toBe('Wells'))
  })

  it('shows a dash for a request with no partner', async () => {
    signIn({ is_host: 1, permissions: ['view funding requests'] })
    allowBackgroundCalls()
    api('post', '/common/get-all-partners', { status: true, message: 'ok', data: PARTNER_OPTIONS })
    api('post', LIST, paginated([{ ...ROWS[0], partner: null }], { funding_types: [] }))
    renderPage(<FundingSequence />, { path: '/intake-review/funding-request' })

    const row = (await screen.findByText('Amy Zed')).closest('tr') as HTMLElement
    const partnerCell = row.querySelectorAll('td')[1]
    expect(partnerCell).toHaveTextContent('-')
  })

  it('gives a partner neither the column nor the dropdown, and never asks for the partner list', async () => {
    const { options } = mount(false)
    await screen.findByText('Working Capital')

    expect(screen.queryByRole('columnheader', { name: /partner name/i })).not.toBeInTheDocument()
    expect(Array.from(document.querySelectorAll('.p-dropdown-label')).map((el) => el.textContent)).not.toContain('All Partners')
    expect(options.calls).toBe(0)
  })
})
