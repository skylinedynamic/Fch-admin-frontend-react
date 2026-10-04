import { afterEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { Route, Routes, useLocation } from 'react-router-dom'
import userEvent from '@testing-library/user-event'
import { useAuthStore } from '../../../../src/store/auth/authStore'
import { server } from '../../../mocks/server'
import { renderWithProviders, screen } from '../../../test-utils'
import CreditProfileRequestDetails from '../../../../src/pages/applications/credit-profile-requests/CreditProfileRequestDetails'

const request = {
  id: 7,
  borrower_id: 3,
  first_name: 'Giselle',
  middle_name: null,
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
  credit_authorizations: [],
  borrower: null,
}

const serveRequest = () =>
  server.use(
    http.get('*/admin/credit-profile-requests/7', () =>
      HttpResponse.json({ status: true, message: 'ok', data: request }),
    ),
  )

/** Stands in for the client screen, showing the tab it was asked to open. */
const ClientStub = () => {
  const location = useLocation()
  return <div>client {location.pathname} tab {String(location.state?.activeTab)}</div>
}

const renderDetails = () =>
  renderWithProviders(
    <Routes>
      <Route path="/intake-review/credit-profile-requests/:id" element={<CreditProfileRequestDetails />} />
      <Route path="/clients/:id" element={<ClientStub />} />
    </Routes>,
    { route: '/intake-review/credit-profile-requests/7' },
  )

describe('Credit profile request details', () => {
  afterEach(() => {
    server.resetHandlers()
    useAuthStore.setState({ user: null })
  })

  it('opens the borrower credit profile tab from the Go to Borrower Credit Profile button', async () => {
    useAuthStore.setState({ user: { id: 1, permissions: ['view clients'] } as never })
    serveRequest()
    renderDetails()

    const button = await screen.findByRole('link', { name: /go to borrower credit profile/i })
    expect(button).toHaveAttribute('href', '/clients/3')

    await userEvent.setup().click(button)
    expect(await screen.findByText('client /clients/3 tab creditProfile')).toBeInTheDocument()
  })

  it('hides the button from someone who cannot view clients', async () => {
    useAuthStore.setState({ user: { id: 1, permissions: [] } as never })
    serveRequest()
    renderDetails()

    await screen.findByRole('button', { name: /reveal/i })
    expect(screen.queryByRole('link', { name: /go to borrower credit profile/i })).not.toBeInTheDocument()
  })

  it('leaves a gap between the SSN and its Reveal button', async () => {
    server.use(
      http.get('*/admin/credit-profile-requests/7', () =>
        HttpResponse.json({ status: true, message: 'ok', data: request }),
      ),
    )
    renderWithProviders(
      <Routes>
        <Route path="/intake-review/credit-profile-requests/:id" element={<CreditProfileRequestDetails />} />
      </Routes>,
      { route: '/intake-review/credit-profile-requests/7' },
    )

    const reveal = await screen.findByRole('button', { name: /reveal/i })
    expect(reveal).toHaveClass('ms-2')
  })
})
