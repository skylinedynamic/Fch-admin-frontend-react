import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { render, screen } from '@testing-library/react'
import { useAuthStore } from '../../../src/store/auth'
import NonHostPartnerRoute from '../../../src/lib/auth/NonHostPartnerRoute'

const reset = () => useAuthStore.setState({ token: undefined, user: null, userSubscription: null, rememberMe: true })

const renderAt = () =>
  render(
    <MemoryRouter initialEntries={['/my-subscription']}>
      <Routes>
        <Route element={<NonHostPartnerRoute />}>
          <Route path="/my-subscription" element={<div>My Subscription</div>} />
        </Route>
        <Route path="/" element={<div>Dashboard</div>} />
      </Routes>
    </MemoryRouter>
  )

const partnerWithPayment = { id: 1, is_host: 0, entity_type: 'Partner', first_payment_date: '2026-01-01' }

describe('NonHostPartnerRoute', () => {
  beforeEach(reset)
  afterEach(reset)

  it('renders for a non-host partner with a first payment date', () => {
    useAuthStore.setState({ user: partnerWithPayment })
    renderAt()
    expect(screen.getByText('My Subscription')).toBeInTheDocument()
  })

  it('redirects a host (even if a partner)', () => {
    useAuthStore.setState({ user: { ...partnerWithPayment, is_host: 1 } })
    renderAt()
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
  })

  it('redirects a non-partner entity type', () => {
    useAuthStore.setState({ user: { ...partnerWithPayment, entity_type: 'Borrower' } })
    renderAt()
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
  })

  /** My Subscription is the partner's own account - its staff never reach it (findings O23). */
  it('redirects the partner staff (an Employee login)', () => {
    useAuthStore.setState({ user: { ...partnerWithPayment, entity_type: 'Employee' } })
    renderAt()
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
  })

  it('redirects a partner with no first_payment_date yet', () => {
    useAuthStore.setState({ user: { ...partnerWithPayment, first_payment_date: null } })
    renderAt()
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
  })
})
