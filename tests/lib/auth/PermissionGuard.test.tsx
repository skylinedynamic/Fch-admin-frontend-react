import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { useAuthStore } from '../../../src/store/auth'
import PermissionGuard from '../../../src/lib/auth/PermissionGuard'

const reset = () => useAuthStore.setState({ token: undefined, user: null, userSubscription: null, rememberMe: true })

describe('PermissionGuard', () => {
  beforeEach(reset)
  afterEach(reset)

  it('renders children when no constraints are given and the user is not restricted', () => {
    useAuthStore.setState({ user: { id: 1 } })
    render(<PermissionGuard>Visible</PermissionGuard>)
    expect(screen.getByText('Visible')).toBeInTheDocument()
  })

  it('renders children when the user has any of the required permissions', () => {
    useAuthStore.setState({ user: { id: 1, permissions: ['manage-users'] } })
    render(<PermissionGuard any={['edit-roles', 'manage-users']}>Visible</PermissionGuard>)
    expect(screen.getByText('Visible')).toBeInTheDocument()
  })

  it('renders the fallback when the user has none of the required permissions', () => {
    useAuthStore.setState({ user: { id: 1, permissions: [] } })
    render(<PermissionGuard any={['edit-roles']} fallback={<span>Locked</span>}>Visible</PermissionGuard>)
    expect(screen.queryByText('Visible')).not.toBeInTheDocument()
    expect(screen.getByText('Locked')).toBeInTheDocument()
  })

  it('checks role membership', () => {
    useAuthStore.setState({ user: { id: 1, role: 'admin' } })
    render(<PermissionGuard role={['manager', 'admin']}>Visible</PermissionGuard>)
    expect(screen.getByText('Visible')).toBeInTheDocument()
  })

  it('still shows essential-permission content even when the subscription is restricted', () => {
    useAuthStore.setState({
      user: { id: 1, is_host: false, subscription_status: 'Suspended', permissions: ['view invoices'] },
    })
    render(<PermissionGuard any={['view invoices']} fallback={<span>Locked</span>}>Visible</PermissionGuard>)
    // "view invoices" is on the essential-permissions allowlist, so it stays visible even when restricted.
    expect(screen.getByText('Visible')).toBeInTheDocument()
  })

  it('hides non-essential content when the user is restricted', () => {
    useAuthStore.setState({
      user: { id: 1, is_host: false, subscription_status: 'Suspended', permissions: ['manage-users'] },
    })
    render(<PermissionGuard any={['manage-users']} fallback={<span>Locked</span>}>Visible</PermissionGuard>)
    expect(screen.getByText('Locked')).toBeInTheDocument()
  })

  it('renders nothing (no fallback) by default when denied', () => {
    useAuthStore.setState({ user: { id: 1, role: 'viewer' } })
    const { container } = render(<PermissionGuard role="admin">Visible</PermissionGuard>)
    expect(container).toBeEmptyDOMElement()
  })
})
