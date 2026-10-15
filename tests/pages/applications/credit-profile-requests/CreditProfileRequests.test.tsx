import { afterEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../../../mocks/server'
import { renderWithProviders, screen, within } from '../../../test-utils'
import CreditProfileRequests from '../../../../src/pages/applications/credit-profile-requests/CreditProfileRequests'

const row = {
  id: 7,
  borrower_id: 3,
  first_name: 'Giselle',
  middle_name: 'Indigo',
  last_name: 'Noel',
  address: '1 Main St',
  apt_suite_other: null,
  city: 'Austin',
  state: 'Texas',
  zip: '78701',
  ssn: '123456789',
  date_of_birth: '1990-01-01',
  phone: '5125550100',
  email: 'giselle@example.com',
  created_at: '2026-10-01T10:00:00Z',
  updated_at: '2026-10-01T10:00:00Z',
  borrower: {
    id: 3,
    business_name: 'Noel Holdings LLC',
    first_name: 'Giselle',
    last_name: 'Noel',
    email: 'giselle@example.com',
    phone_number: '5125550100',
  },
}

const serveList = (rows: unknown[] = [row]) =>
  server.use(
    http.post('*/admin/credit-profile-requests', () =>
      HttpResponse.json({
        status: true,
        message: 'ok',
        data: { current_page: 1, data: rows, total: rows.length, per_page: 10, last_page: 1 },
      }),
    ),
  )

describe('Request Credit Profile list', () => {
  afterEach(() => server.resetHandlers())

  it('shows Applicant first, then Company, with no Borrower or Action column', async () => {
    serveList()
    renderWithProviders(<CreditProfileRequests />)

    await screen.findByText('Giselle Indigo Noel')

    const headers = screen.getAllByRole('columnheader').map((h) => h.textContent?.trim())
    expect(headers.slice(0, 2)).toEqual(['Applicant', 'Company'])
    expect(headers).not.toContain('Borrower')
    expect(headers).not.toContain('Action')
  })

  it('shows the business name under Company', async () => {
    serveList()
    renderWithProviders(<CreditProfileRequests />)

    const cell = await screen.findByText('Noel Holdings LLC')
    expect(within(cell.closest('tr') as HTMLElement).getByText('Giselle Indigo Noel')).toBeInTheDocument()
  })

  it('shows whether each request is still pending', async () => {
    serveList([
      { ...row, id: 7, request_status: 'pending' },
      { ...row, id: 8, first_name: 'Done', middle_name: null, request_status: 'completed' },
    ])
    renderWithProviders(<CreditProfileRequests />)

    const pendingRow = (await screen.findByText('Giselle Indigo Noel')).closest('tr') as HTMLElement
    const doneRow = screen.getByText('Done Noel').closest('tr') as HTMLElement

    expect(within(pendingRow).getByText('Pending')).toBeInTheDocument()
    expect(within(doneRow).getByText('Completed')).toBeInTheDocument()
    expect(screen.getAllByRole('columnheader').map((h) => h.textContent?.trim())).toContain('Status')
  })

  // A borrower's one request is updated in place when they submit again, so
  // "latest" is updated_at: the list opens latest-first by it and dates each
  // row by it, so a resubmission shows at the top with today's date.
  it('asks the API for the latest request first', async () => {
    let body: Record<string, unknown> | null = null
    server.use(
      http.post('*/admin/credit-profile-requests', async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>
        return HttpResponse.json({ status: true, message: 'ok', data: { current_page: 1, data: [row], total: 1, per_page: 10, last_page: 1 } })
      }),
    )
    renderWithProviders(<CreditProfileRequests />)

    await screen.findByText('Giselle Indigo Noel')
    expect(body).toMatchObject({ sort_field: 'updated_at', sort_order: 'desc' })
  })

  it('dates each request by when it was last submitted', async () => {
    serveList([{ ...row, created_at: '2026-10-01T10:00:00Z', updated_at: '2026-10-12T10:00:00Z' }])
    renderWithProviders(<CreditProfileRequests />)

    const tr = (await screen.findByText('Giselle Indigo Noel')).closest('tr') as HTMLElement
    expect(within(tr).getByText('Oct 12, 2026')).toBeInTheDocument()
    expect(within(tr).queryByText('Oct 1, 2026')).not.toBeInTheDocument()
  })

  it('keeps the order the API returns, latest first', async () => {
    serveList([
      { ...row, id: 9, first_name: 'Newest', middle_name: null, updated_at: '2026-10-12T10:00:00Z' },
      { ...row, id: 7, first_name: 'Oldest', middle_name: null, updated_at: '2026-10-01T10:00:00Z' },
    ])
    renderWithProviders(<CreditProfileRequests />)

    await screen.findByText('Newest Noel')
    const names = screen.getAllByText(/^(Newest|Oldest) Noel$/).map((el) => el.textContent)
    expect(names).toEqual(['Newest Noel', 'Oldest Noel'])
  })
})
