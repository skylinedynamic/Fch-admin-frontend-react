import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { render, screen } from '@testing-library/react'
import { useAuthStore } from '../../../src/store/auth'
import HostRoute from '../../../src/lib/auth/HostRoute'

const reset = () => useAuthStore.setState({ token: undefined, user: null, userSubscription: null, rememberMe: true })

const renderAt = () =>
  render(
    <MemoryRouter initialEntries={['/host-only']}>
      <Routes>
        <Route element={<HostRoute />}>
          <Route path="/host-only" element={<div>Host Only Content</div>} />
        </Route>
        <Route path="/" element={<div>Dashboard</div>} />
      </Routes>
    </MemoryRouter>
  )

describe('HostRoute', () => {
  beforeEach(reset)
  afterEach(reset)

  it('redirects a non-host user to the dashboard', () => {
    useAuthStore.setState({ user: { id: 1, is_host: 0 } })
    renderAt()
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
  })

  it('renders the content for a host user (is_host === 1)', () => {
    useAuthStore.setState({ user: { id: 1, is_host: 1 } })
    renderAt()
    expect(screen.getByText('Host Only Content')).toBeInTheDocument()
  })
})
