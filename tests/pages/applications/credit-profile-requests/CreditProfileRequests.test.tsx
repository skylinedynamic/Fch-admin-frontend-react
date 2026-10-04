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

const serveList = () =>
  server.use(
    http.post('*/admin/credit-profile-requests', () =>
      HttpResponse.json({
        status: true,
        message: 'ok',
        data: { current_page: 1, data: [row], total: 1, per_page: 10, last_page: 1 },
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
})
