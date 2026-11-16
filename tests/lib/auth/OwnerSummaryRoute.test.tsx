import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { render, screen } from '@testing-library/react'
import { useAuthStore } from '../../../src/store/auth'
import HostOwnerRoute from '../../../src/lib/auth/HostOwnerRoute'

const reset = () => useAuthStore.setState({ token: undefined, user: null, userSubscription: null, rememberMe: true })

const renderAt = () =>
  render(
    <MemoryRouter initialEntries={['/owner-only']}>
      <Routes>
        <Route element={<HostOwnerRoute />}>
          <Route path="/owner-only" element={<div>Owner Content</div>} />
        </Route>
        <Route path="/" element={<div>Dashboard</div>} />
      </Routes>
    </MemoryRouter>
  )

describe('HostOwnerRoute', () => {
  beforeEach(reset)
  afterEach(reset)

  it('renders for the host owner', () => {
    useAuthStore.setState({ user: { id: 1, is_host: 1, entity_type: 'Partner', permissions: [] } as never })
    renderAt()
    expect(screen.getByText('Owner Content')).toBeInTheDocument()
  })

  it('redirects host staff who do not manage commissions', () => {
    useAuthStore.setState({ user: { id: 1, is_host: 1, entity_type: 'Employee', permissions: [] } as never })
    renderAt()
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
  })

  it('redirects a partner', () => {
    useAuthStore.setState({ user: { id: 1, is_host: 0, entity_type: 'Partner', permissions: [] } as never })
    renderAt()
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
  })
})
