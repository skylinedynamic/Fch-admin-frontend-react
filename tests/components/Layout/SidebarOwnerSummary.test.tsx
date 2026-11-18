import { describe, expect, it } from 'vitest'
import { renderWithProviders, screen } from '../../test-utils'
import Sidebar from '../../../src/components/Layout/Sidebar'
import { useAuthStore } from '../../../src/store/auth'
import { OWNER_SUMMARY_PERMISSION } from '../../../src/config/ownerSummary'

const signIn = (user: Record<string, unknown>) =>
  useAuthStore.setState({ token: 't', user: { id: 1, name: 'Someone', permissions: [], ...user }, userSubscription: null } as never)

// Only a login holding "view business insights" - a developer-only permission
// fch-api gives to the Developer role alone - sees it. The email (it used to be
// one hard-coded login) and the host owner role play no part.
describe('Sidebar "Business Insights" item', () => {
  it('shows to a login holding view business insights and links to /business-insights', () => {
    signIn({ email: 'dev@example.test', is_host: 1, entity_type: 'Employee', permissions: [OWNER_SUMMARY_PERMISSION.VIEW] })
    renderWithProviders(<Sidebar />)

    expect(screen.getByRole('link', { name: /^business insights$/i })).toHaveAttribute('href', '/business-insights')
  })

  it('is hidden from the formerly allowed email without the permission', () => {
    signIn({ email: 'developer@fch.com', is_host: 1, entity_type: 'Partner', permissions: ['view commission'] })
    renderWithProviders(<Sidebar />)

    expect(screen.queryByRole('link', { name: /^business insights$/i })).not.toBeInTheDocument()
  })

  it('is hidden from a host owner without the permission', () => {
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
