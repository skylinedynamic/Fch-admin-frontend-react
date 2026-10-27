import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('react-toastify', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-toastify')>()
  return { ...actual, toast: Object.assign(vi.fn(), { info: vi.fn(), success: vi.fn(), error: vi.fn(), warn: vi.fn() }) }
})

import { http, HttpResponse } from 'msw'
import { Route, Routes } from 'react-router-dom'
import userEvent from '@testing-library/user-event'
import { server } from '../../mocks/server'
import { renderWithProviders, screen, within } from '../../test-utils'
import { useAuthStore } from '../../../src/store/auth/authStore'
import EmbedFormSubmissionDetails from '../../../src/pages/embed-form/EmbedFormSubmissionDetails'

/**
 * The header of a converted loan application: next to "View Borrower", a
 * "View Funding Application" button opens the funding application the
 * conversion created - placed before the Submission Status select.
 */
const converted = {
  id: 3,
  submission_uid: 'uid-3',
  partner_id: 1,
  first_name: 'Odessa',
  last_name: 'Mccall',
  email: 'odessa@example.test',
  status: 'converted',
  converted_borrower_id: 42,
  converted_borrower: { id: 42, full_name: 'Odessa Mccall', status: 'active', is_free_trail: true },
  converted_funding_application_id: 77,
  attachments: [],
  co_borrowers: [],
  created_at: '2026-10-15 09:00:00',
}

const signInWith = (permissions: string[]) =>
  useAuthStore.setState({ token: 'tok', user: { id: 1, name: 'Host Admin', permissions } })

const serve = (submission: Record<string, unknown>) =>
  server.use(
    http.get('*/common/embed-forms/submissions/3', () => HttpResponse.json({ status: true, message: 'ok', data: submission })),
    // The layout re-reads the signed-in user's subscription on load.
    http.get('*/common/user-details', () => HttpResponse.json({ status: true, data: { user: {} } }))
  )

const renderPage = () =>
  renderWithProviders(
    <Routes>
      <Route path="/embed-form/loan-applications/:id" element={<EmbedFormSubmissionDetails />} />
      <Route path="/intake-review/funding-application/:id" element={<div>Funding application page</div>} />
    </Routes>,
    { route: '/embed-form/loan-applications/3' }
  )

describe('Loan application details › View Funding Application', () => {
  afterEach(() => {
    server.resetHandlers()
    useAuthStore.setState({ token: undefined, user: null })
  })

  it('opens the funding application the conversion created', async () => {
    signInWith(['view application', 'view funding application'])
    serve(converted)
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: /View Funding Application/ }))

    expect(await screen.findByText('Funding application page')).toBeInTheDocument()
  })

  it('sits between the Submission Status select and View Borrower', async () => {
    signInWith(['view application', 'view funding application'])
    serve(converted)
    renderPage()

    const button = await screen.findByRole('button', { name: /View Funding Application/ })
    const status = screen.getByText('Submission Status')
    const borrower = screen.getByRole('button', { name: /View Borrower/ })

    // Status, then View Funding Application, then View Borrower.
    expect(status.compareDocumentPosition(button) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(button.compareDocumentPosition(borrower) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    const group = button.closest('.d-flex') as HTMLElement
    expect(within(group).getByText('Submission Status')).toBeInTheDocument()
    expect(within(group).getByRole('button', { name: /View Borrower/ })).toBe(borrower)
  })

  it('shows both buttons in the primary colour', async () => {
    signInWith(['view application', 'view funding application'])
    serve(converted)
    renderPage()

    expect(await screen.findByRole('button', { name: /View Funding Application/ })).toHaveClass('btn-primary')
    expect(screen.getByRole('button', { name: /View Borrower/ })).toHaveClass('btn-primary')
  })

  it('is not offered without access to funding applications', async () => {
    signInWith(['view application'])
    serve(converted)
    renderPage()

    await screen.findByRole('button', { name: /View Borrower/ })
    expect(screen.queryByRole('button', { name: /View Funding Application/ })).not.toBeInTheDocument()
  })

  it('is not offered when no funding application was created', async () => {
    signInWith(['view application', 'view funding application'])
    serve({ ...converted, converted_funding_application_id: null })
    renderPage()

    await screen.findByRole('button', { name: /View Borrower/ })
    expect(screen.queryByRole('button', { name: /View Funding Application/ })).not.toBeInTheDocument()
  })

  it('is not offered before the application is converted', async () => {
    signInWith(['view application', 'view funding application', 'convert application'])
    serve({ ...converted, status: 'new', converted_borrower_id: null, converted_borrower: null, converted_funding_application_id: null })
    renderPage()

    await screen.findAllByRole('button', { name: /Convert to Free Plan Borrower/ })
    expect(screen.queryByRole('button', { name: /View Funding Application/ })).not.toBeInTheDocument()
  })
})

// BUG-098: a Rejected application could still be converted (the API now refuses it too).
describe('Loan application details › Convert on a rejected application', () => {
  afterEach(() => {
    server.resetHandlers()
    useAuthStore.setState({ token: undefined, user: null })
  })

  const rejected = { ...converted, status: 'rejected', converted_borrower_id: null, converted_borrower: null, converted_funding_application_id: null }

  it('is disabled, and says the status has to change first', async () => {
    signInWith(['view application', 'convert application'])
    serve(rejected)
    renderPage()

    const [convert] = await screen.findAllByRole('button', { name: /Convert to Free Plan Borrower/ })
    expect(convert).toBeDisabled()
    expect(screen.getByText('Rejected applications cannot be converted. Change the status to convert it.')).toBeInTheDocument()
  })

  it('stays enabled on an application in review', async () => {
    signInWith(['view application', 'convert application'])
    serve({ ...rejected, status: 'reviewing' })
    renderPage()

    const [convert] = await screen.findAllByRole('button', { name: /Convert to Free Plan Borrower/ })
    expect(convert).toBeEnabled()
    expect(screen.queryByText(/Rejected applications cannot be converted/)).not.toBeInTheDocument()
  })
})

/**
 * The business EIN, the business start date (stored as
 * business_checking_start_date), the requested amount in its currency and the
 * additional funding types, as the API sends them.
 */
describe('Loan application details › business and funding answers', () => {
  const answered = {
    ...converted,
    business_ein: '123456789',
    business_ein_display: '12-3456789',
    years_in_business: '3+ years',
    business_checking_start_date: '2019-04-01',
    currency: 'EUR',
    currency_symbol: '€',
    requested_amount: '150000.00',
    requested_amount_formatted: '€150,000.00',
    preferred_funding_type: 'Term Loan',
    additional_funding_types: ['SBA Loan', 'Line of Credit'],
  }

  afterEach(() => {
    server.resetHandlers()
    useAuthStore.setState({ token: undefined, user: null })
  })

  it('shows the EIN written as an EIN', async () => {
    signInWith(['view application'])
    serve(answered)
    renderPage()

    expect(await screen.findByText('Business EIN')).toBeInTheDocument()
    expect(screen.getByText('12-3456789')).toBeInTheDocument()
  })

  it('shows the SSN as every SSN is shown: ***-**-1234 (the API sends only the last four)', async () => {
    signInWith(['view application'])
    serve({ ...answered, last_4_ssn: '6789', co_borrowers: [{ id: 1, first_name: 'Cora', last_name: 'Co', last_4_ssn: '4321' }] })
    renderPage()

    expect(await screen.findByText('***-**-6789')).toBeInTheDocument()
    expect(screen.getByText('***-**-4321')).toBeInTheDocument()
    expect(screen.queryByText(/•••-••-/)).not.toBeInTheDocument()
  })

  it('calls the checking date the business start date', async () => {
    signInWith(['view application'])
    serve(answered)
    renderPage()

    expect(await screen.findByText('Business Start Date')).toBeInTheDocument()
    expect(screen.queryByText('Checking Opened')).not.toBeInTheDocument()
  })

  it('shows the requested amount in its currency', async () => {
    signInWith(['view application'])
    serve(answered)
    renderPage()

    // In the header summary and in the Funding Request section.
    expect((await screen.findAllByText('€150,000.00')).length).toBeGreaterThan(0)
    expect(screen.queryByText('$150,000.00')).not.toBeInTheDocument()
    expect(screen.getByText('EUR')).toBeInTheDocument()
  })

  it('lists the additional funding types', async () => {
    signInWith(['view application'])
    serve(answered)
    renderPage()

    expect(await screen.findByText('Additional Funding Types')).toBeInTheDocument()
    expect(screen.getByText('SBA Loan, Line of Credit')).toBeInTheDocument()
  })

  it('leaves the additional funding types out when none were chosen', async () => {
    signInWith(['view application'])
    serve({ ...answered, additional_funding_types: [] })
    renderPage()

    await screen.findByText('Preferred Funding Type')
    expect(screen.queryByText('SBA Loan, Line of Credit')).not.toBeInTheDocument()
  })
})

/**
 * The host sees every partner's applications, so the details page says which
 * partner this one came through; a partner looking at their own is not told.
 */
describe('Loan application details › partner', () => {
  const fromPartner = {
    ...converted,
    partner: { id: 4, company_name: 'Acme Lending', full_name: 'Pat Partner', partner_type: 'White-Label Partner (WL)', is_host: false },
  }

  afterEach(() => {
    server.resetHandlers()
    useAuthStore.setState({ token: undefined, user: null })
  })

  it('tells the host which partner the application came through', async () => {
    useAuthStore.setState({ token: 'tok', user: { id: 1, name: 'Host Admin', is_host: 1, permissions: ['view application'] } as never })
    serve(fromPartner)
    renderWithProviders(
      <Routes>
        <Route path="/embed-form/loan-applications/:id" element={<EmbedFormSubmissionDetails />} />
      </Routes>,
      { route: '/embed-form/loan-applications/3' }
    )

    // In the header, beside the applicant's contact details.
    const line = await screen.findByText(/Partner:/)
    expect(line).toHaveTextContent('Partner: Acme Lending')
    expect(line).toHaveTextContent('White Label')
  })

  it('does not give a partner the header line about themselves', async () => {
    useAuthStore.setState({ token: 'tok', user: { id: 1, name: 'Pat Partner', is_host: 0, permissions: ['view application'] } as never })
    serve(fromPartner)
    renderWithProviders(
      <Routes>
        <Route path="/embed-form/loan-applications/:id" element={<EmbedFormSubmissionDetails />} />
      </Routes>,
      { route: '/embed-form/loan-applications/3' }
    )

    await screen.findAllByText('Odessa Mccall')
    // The header line is for the host; "Received Via Partner" stays in the metadata card.
    expect(screen.queryByText(/Partner:/)).not.toBeInTheDocument()
    expect(screen.queryByText('White Label')).not.toBeInTheDocument()
  })
})
