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

  it('shows "Not provided" for details an update request could not take from the profile', async () => {
    // A borrower who never submitted the form asked for an update: the request
    // was opened from their profile, which held no SSN, ZIP, phone, email,
    // address or date of birth.
    server.use(
      http.get('*/admin/credit-profile-requests/7', () =>
        HttpResponse.json({
          status: true,
          message: 'ok',
          data: { ...request, ssn: null, zip: null, phone: null, email: null, address: null, date_of_birth: null },
        }),
      ),
    )

    renderDetails()

    const field = async (label: string) => (await screen.findByText(label)).closest('.cpr-field') as HTMLElement
    for (const label of ['Date of Birth', 'Social Security Number', 'Email Address', 'Phone Number', 'Street Address', 'Zip Code']) {
      expect(await field(label)).toHaveTextContent('Not provided')
    }
    // Nothing to reveal, mail or call.
    expect(screen.queryByRole('button', { name: /reveal/i })).not.toBeInTheDocument()
    expect(document.querySelector('a[href="mailto:null"], a[href="tel:null"], a[href="mailto:"], a[href="tel:"]')).toBeNull()
    // What the profile did hold still shows.
    expect(await field('City')).toHaveTextContent('Austin')
  })
})
