import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { render, screen } from '@testing-library/react'
import { useAuthStore } from '../../../src/store/auth'
import OwnerSummaryRoute from '../../../src/lib/auth/OwnerSummaryRoute'

const reset = () => useAuthStore.setState({ token: undefined, user: null, userSubscription: null, rememberMe: true })

const renderAt = () =>
  render(
    <MemoryRouter initialEntries={['/business-insights']}>
      <Routes>
        <Route element={<OwnerSummaryRoute />}>
          <Route path="/business-insights" element={<div>Insights Content</div>} />
        </Route>
        <Route path="/" element={<div>Dashboard</div>} />
      </Routes>
    </MemoryRouter>
  )

const signIn = (user: Record<string, unknown>) => useAuthStore.setState({ user: { id: 1, permissions: [], ...user } as never })

// Business Insights is open to the allowed emails only - who the login is
// (host, owner, staff, partner) plays no part.
describe('OwnerSummaryRoute', () => {
  beforeEach(reset)
  afterEach(reset)

  it('renders for the allowed email', () => {
    signIn({ email: 'developer@fch.com', is_host: 1, entity_type: 'Partner' })
    renderAt()
    expect(screen.getByText('Insights Content')).toBeInTheDocument()
  })

  it('matches the allowed email whatever its case', () => {
    signIn({ email: 'Developer@FCH.com', is_host: 1, entity_type: 'Partner' })
    renderAt()
    expect(screen.getByText('Insights Content')).toBeInTheDocument()
  })

  it('renders for the allowed email even without a host owner role or permission', () => {
    signIn({ email: 'developer@fch.com', is_host: 0, entity_type: 'Employee' })
    renderAt()
    expect(screen.getByText('Insights Content')).toBeInTheDocument()
  })

  it('redirects a host owner whose email is not allowed', () => {
    signIn({ email: 'owner@example.test', is_host: 1, entity_type: 'Partner', permissions: ['update commission'] })
    renderAt()
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
  })

  it('redirects when nobody is signed in', () => {
    renderAt()
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
  })
})
