import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { render, screen } from '@testing-library/react'
import { useAuthStore } from '../../../src/store/auth'
import PermissionRoute from '../../../src/lib/auth/PermissionRoute'

const reset = () => useAuthStore.setState({ token: undefined, user: null, userSubscription: null, rememberMe: true })

const renderAt = (permission: string | string[], redirectTo?: string) =>
  render(
    <MemoryRouter initialEntries={['/roles']}>
      <Routes>
        <Route element={<PermissionRoute permission={permission} redirectTo={redirectTo} />}>
          <Route path="/roles" element={<div>Roles Page</div>} />
        </Route>
        <Route path="/" element={<div>Dashboard</div>} />
        <Route path="/access-denied" element={<div>Access Denied</div>} />
      </Routes>
    </MemoryRouter>
  )

describe('PermissionRoute', () => {
  beforeEach(reset)
  afterEach(reset)

  it('renders the route when the user has the required permission', () => {
    useAuthStore.setState({ user: { id: 1, permissions: ['manage-roles'] } })
    renderAt('manage-roles')
    expect(screen.getByText('Roles Page')).toBeInTheDocument()
  })

  it('redirects to /access-denied (not restricted) when the permission is missing', () => {
    useAuthStore.setState({ user: { id: 1, permissions: [] } })
    renderAt('manage-roles')
    expect(screen.getByText('Access Denied')).toBeInTheDocument()
  })

  it('accepts an array of permissions, matching any one of them', () => {
    useAuthStore.setState({ user: { id: 1, permissions: ['manage-roles'] } })
    renderAt(['edit-roles', 'manage-roles'])
    expect(screen.getByText('Roles Page')).toBeInTheDocument()
  })

  it('redirects to / (dashboard) instead of /access-denied when the subscription is restricted', () => {
    useAuthStore.setState({
      user: { id: 1, permissions: ['manage-roles'] },
      userSubscription: { subscription_status: 'Suspended' },
    })
    renderAt('manage-roles')
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
  })

  it('still allows an essential-permission route through even when restricted', () => {
    useAuthStore.setState({
      user: { id: 1, permissions: ['view dashboard'] },
      userSubscription: { subscription_status: 'Suspended' },
    })
    renderAt('view dashboard')
    expect(screen.getByText('Roles Page')).toBeInTheDocument()
  })
})
