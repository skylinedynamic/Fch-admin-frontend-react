import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { render, screen } from '@testing-library/react'
import { useAuthStore } from '../../../src/store/auth'
import PartnerHostRoute from '../../../src/lib/auth/PartnerHostRoute'

const reset = () => useAuthStore.setState({ token: undefined, user: null, userSubscription: null, rememberMe: true })

const renderAt = () =>
  render(
    <MemoryRouter initialEntries={['/partner-host-only']}>
      <Routes>
        <Route element={<PartnerHostRoute />}>
          <Route path="/partner-host-only" element={<div>Partner Host Content</div>} />
        </Route>
        <Route path="/" element={<div>Dashboard</div>} />
      </Routes>
    </MemoryRouter>
  )

describe('PartnerHostRoute', () => {
  beforeEach(reset)
  afterEach(reset)

  it('renders for a host whose entity_type is Partner', () => {
    useAuthStore.setState({ user: { id: 1, is_host: 1, entity_type: 'Partner' } })
    renderAt()
    expect(screen.getByText('Partner Host Content')).toBeInTheDocument()
  })

  it('redirects a non-host partner', () => {
    useAuthStore.setState({ user: { id: 1, is_host: 0, entity_type: 'Partner' } })
    renderAt()
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
  })

  it('redirects a host whose entity_type is not Partner', () => {
    useAuthStore.setState({ user: { id: 1, is_host: 1, entity_type: 'Employee' } })
    renderAt()
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
  })
})
