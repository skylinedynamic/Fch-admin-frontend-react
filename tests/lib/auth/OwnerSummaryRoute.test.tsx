import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { render, screen } from '@testing-library/react'
import { useAuthStore } from '../../../src/store/auth'
import OwnerSummaryRoute from '../../../src/lib/auth/OwnerSummaryRoute'
import { OWNER_SUMMARY_PERMISSION } from '../../../src/config/ownerSummary'

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

// Business Insights is open to whoever holds "view business insights" - a
// developer-only permission (fch-api gives it to the Developer role alone).
// The login's email or entity plays no part.
describe('OwnerSummaryRoute', () => {
  beforeEach(reset)
  afterEach(reset)

  it('renders for a login holding view business insights', () => {
    signIn({ email: 'dev@example.test', is_host: 1, entity_type: 'Employee', permissions: [OWNER_SUMMARY_PERMISSION.VIEW] })
    renderAt()
    expect(screen.getByText('Insights Content')).toBeInTheDocument()
  })

  it('redirects the formerly allowed email when it lacks the permission', () => {
    signIn({ email: 'developer@fch.com', is_host: 1, entity_type: 'Partner' })
    renderAt()
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
  })

  it('redirects a host owner without the permission', () => {
    signIn({ email: 'owner@example.test', is_host: 1, entity_type: 'Partner', permissions: ['update commission'] })
    renderAt()
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
  })

  it('does not open for the export or report permission alone', () => {
    signIn({ is_host: 1, entity_type: 'Employee', permissions: [OWNER_SUMMARY_PERMISSION.EXPORT, OWNER_SUMMARY_PERMISSION.MANAGE_REPORT] })
    renderAt()
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
  })

  it('redirects when nobody is signed in', () => {
    renderAt()
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
  })
})
