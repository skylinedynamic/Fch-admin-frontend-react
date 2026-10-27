import { beforeEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { renderWithProviders, screen } from '../../test-utils'
import { server } from '../../mocks/server'
import Sidebar from '../../../src/components/Layout/Sidebar'
import { useAuthStore } from '../../../src/store/auth'

// BUG-097: Request Credit Profile had no permission, so every host user got the
// Intake & Review menu - even a user whose role only lets them view leads.
const signInHost = (permissions: string[]) =>
  useAuthStore.setState({ token: 't', user: { id: 1, name: 'Hal Host', is_host: 1, entity_type: 'Employee', permissions }, userSubscription: null } as never)

describe('Sidebar "Intake & Review" menu', () => {
  beforeEach(() => {
    server.use(http.get('*/common/notifications', () => HttpResponse.json({ status: true, data: [], meta: { unread_count: 0 } })))
  })

  it('is hidden from a host user who may only view leads', () => {
    signInHost(['view leads'])
    renderWithProviders(<Sidebar />)

    expect(screen.getByRole('link', { name: /leads/i })).toBeInTheDocument()
    expect(screen.queryByText('Intake & Review')).not.toBeInTheDocument()
    expect(screen.queryByText('Request Credit Profile')).not.toBeInTheDocument()
  })

  it('shows Request Credit Profile to a host user with "manage credit profile requests"', () => {
    signInHost(['manage credit profile requests'])
    renderWithProviders(<Sidebar />)

    expect(screen.getByText('Intake & Review')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Request Credit Profile', hidden: true })).toHaveAttribute('href', '/intake-review/credit-profile-requests')
  })

  it('never shows Request Credit Profile to a partner, even with the permission', () => {
    useAuthStore.setState({ token: 't', user: { id: 2, name: 'Pat Partner', is_host: 0, entity_type: 'Partner', permissions: ['manage credit profile requests'] }, userSubscription: null } as never)
    renderWithProviders(<Sidebar />)

    expect(screen.queryByText('Request Credit Profile')).not.toBeInTheDocument()
  })
})
