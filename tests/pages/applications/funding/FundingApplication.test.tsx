import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { renderWithProviders, screen, within } from '../../../test-utils'
import { server } from '../../../mocks/server'
import FundingApplication from '../../../../src/pages/applications/funding/FundingApplication'
import { useAuthStore } from '../../../../src/store/auth/authStore'

/**
 * Intake & Review > Funding Application list. Staff once emailed the wrong
 * company because the list showed only the person's name: the same person can
 * apply for several companies. Each row now shows that application's company
 * next to the name, where Entity Type used to be.
 */

// One person, two companies.
const APPLICATIONS = [
  { id: 401, full_name: 'Michael Chen', business_name: 'Alpha Tech Solutions', application_number: 'APP-0001', industry_type: 'Retail', entity_type: 'LLC', purpose_of_funds: 'Inventory', requested_amount: '$80,000', date: '2026-03-02', status: 'Pending' },
  { id: 402, full_name: 'Michael Chen', business_name: 'Chen Logistics Inc', application_number: 'APP-0002', industry_type: 'Transport', entity_type: 'C-Corp', purpose_of_funds: 'Equipment', requested_amount: '$300,000', date: '2026-03-05', status: 'Approved' },
]

const serveList = (rows: Record<string, unknown>[]) =>
  server.use(
    http.post('*/common/request-application/funding-application', () =>
      HttpResponse.json({ status: true, data: rows, meta: { total: rows.length, current_page: 1, last_page: 1, per_page: 10 } })
    ),
    http.get('*/common/request-application/funding-application/card-summary', () =>
      HttpResponse.json({ status: true, data: { total_applications: rows.length, approved: 1, pending: 1, approved_amount: 0 } })
    )
  )

const headers = () => screen.getAllByRole('columnheader').map((th) => th.textContent?.trim() ?? '')

describe('Funding Applications list: Company Name column', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: { id: 1, is_host: true, partner_id: 1, permissions: ['view funding application'] } as never })
  })
  afterEach(() => server.resetHandlers())

  it('shows Name, then Company Name, and no Entity Type', async () => {
    serveList(APPLICATIONS)
    renderWithProviders(<FundingApplication />)

    await screen.findByText('Alpha Tech Solutions')
    const names = headers()
    expect(names[0]).toMatch(/^Name/)
    expect(names[1]).toMatch(/^Company Name/)
    expect(names.some((h) => /Entity Type/.test(h))).toBe(false)
  })

  it("shows each application's own company, even for the same person", async () => {
    serveList(APPLICATIONS)
    renderWithProviders(<FundingApplication />)

    const first = (await screen.findByText('APP-0001')).closest('tr') as HTMLElement
    const second = screen.getByText('APP-0002').closest('tr') as HTMLElement
    expect(within(first).getByText('Michael Chen')).toBeInTheDocument()
    expect(within(first).getByText('Alpha Tech Solutions')).toBeInTheDocument()
    expect(within(second).getByText('Michael Chen')).toBeInTheDocument()
    expect(within(second).getByText('Chen Logistics Inc')).toBeInTheDocument()
  })

  it('shows a dash when an application has no company name', async () => {
    serveList([{ ...APPLICATIONS[0], business_name: null }])
    renderWithProviders(<FundingApplication />)

    const row = (await screen.findByText('APP-0001')).closest('tr') as HTMLElement
    const cells = within(row).getAllByRole('cell')
    expect(cells[1].textContent?.trim()).toBe('-')
  })
})
