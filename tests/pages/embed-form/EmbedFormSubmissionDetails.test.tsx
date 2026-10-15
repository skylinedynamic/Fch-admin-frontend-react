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
