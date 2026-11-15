import { describe, expect, it } from 'vitest'
import { renderWithProviders, screen } from '../../test-utils'
import Sidebar from '../../../src/components/Layout/Sidebar'
import { useAuthStore } from '../../../src/store/auth'

const signIn = (user: Record<string, unknown>) =>
  useAuthStore.setState({ token: 't', user: { id: 1, name: 'Someone', permissions: [], ...user }, userSubscription: null } as never)

describe('Sidebar "Business Insights" item', () => {
  it('shows to the host owner and links to /owner-summary', () => {
    signIn({ is_host: 1, entity_type: 'Partner' })
    renderWithProviders(<Sidebar />)

    expect(screen.getByRole('link', { name: /^business insights$/i })).toHaveAttribute('href', '/owner-summary')
  })

  it('is hidden from host staff who do not manage commissions', () => {
    signIn({ is_host: 1, entity_type: 'Employee', permissions: ['view commission'] })
    renderWithProviders(<Sidebar />)

    expect(screen.queryByRole('link', { name: /^business insights$/i })).not.toBeInTheDocument()
  })

  it('is hidden from a partner', () => {
    signIn({ is_host: 0, entity_type: 'Partner', permissions: ['update commission'] })
    renderWithProviders(<Sidebar />)

    expect(screen.queryByRole('link', { name: /^business insights$/i })).not.toBeInTheDocument()
  })
})
