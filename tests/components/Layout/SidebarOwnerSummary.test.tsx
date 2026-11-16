import { describe, expect, it } from 'vitest'
import { renderWithProviders, screen } from '../../test-utils'
import Sidebar from '../../../src/components/Layout/Sidebar'
import { useAuthStore } from '../../../src/store/auth'

const signIn = (user: Record<string, unknown>) =>
  useAuthStore.setState({ token: 't', user: { id: 1, name: 'Someone', permissions: [], ...user }, userSubscription: null } as never)

// Only the allowed emails see it; the host owner role plays no part.
describe('Sidebar "Business Insights" item', () => {
  it('shows to the allowed email and links to /business-insights', () => {
    signIn({ email: 'developer@fch.com', is_host: 1, entity_type: 'Partner' })
    renderWithProviders(<Sidebar />)

    expect(screen.getByRole('link', { name: /^business insights$/i })).toHaveAttribute('href', '/business-insights')
  })

  it('shows to the allowed email on a host staff login without commission rights', () => {
    signIn({ email: 'developer@fch.com', is_host: 1, entity_type: 'Employee', permissions: ['view commission'] })
    renderWithProviders(<Sidebar />)

    expect(screen.getByRole('link', { name: /^business insights$/i })).toBeInTheDocument()
  })

  it('is hidden from a host owner whose email is not allowed', () => {
    signIn({ email: 'owner@example.test', is_host: 1, entity_type: 'Partner', permissions: ['update commission'] })
    renderWithProviders(<Sidebar />)

    expect(screen.queryByRole('link', { name: /^business insights$/i })).not.toBeInTheDocument()
  })

  it('is hidden from a partner', () => {
    signIn({ email: 'partner@example.test', is_host: 0, entity_type: 'Partner', permissions: ['update commission'] })
    renderWithProviders(<Sidebar />)

    expect(screen.queryByRole('link', { name: /^business insights$/i })).not.toBeInTheDocument()
  })
})
