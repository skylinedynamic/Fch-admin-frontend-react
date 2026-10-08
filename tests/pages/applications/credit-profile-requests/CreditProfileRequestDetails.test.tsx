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
  // Ready to display, as the API sends it - see CreditProfileRequestResource.
  date_of_birth: 'December 16, 1992',
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

  it('prints the date of birth exactly as the API sent it', async () => {
    serveRequest()
    renderDetails()

    expect(await screen.findByText('December 16, 1992')).toBeInTheDocument()
  })

  // The API's string is a calendar date. Parsing it in the browser is what
  // used to hand a viewer behind UTC the previous day, so it must not be.
  it.each(['America/Los_Angeles', 'America/New_York', 'Asia/Dhaka'])(
    'shows the same date of birth to a viewer in %s',
    async (timeZone) => {
      const original = process.env.TZ
      process.env.TZ = timeZone
      try {
        serveRequest()
        renderDetails()

        expect(await screen.findByText('December 16, 1992')).toBeInTheDocument()
        expect(screen.queryByText('December 15, 1992')).not.toBeInTheDocument()
        expect(screen.queryByText('December 17, 1992')).not.toBeInTheDocument()
      } finally {
        process.env.TZ = original
      }
    },
  )

  it('shows a dash when there is no date of birth', async () => {
    server.use(
      http.get('*/admin/credit-profile-requests/7', () =>
        HttpResponse.json({ status: true, message: 'ok', data: { ...request, date_of_birth: null } }),
      ),
    )
    renderDetails()

    const label = await screen.findByText('Date of Birth')
    expect(label.closest('.cpr-field')).toHaveTextContent('—')
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
