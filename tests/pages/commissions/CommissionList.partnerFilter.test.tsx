import { afterEach, describe, expect, it } from 'vitest'
import userEvent from '@testing-library/user-event'
import { server } from '../../mocks/server'
import { PARTNER_OPTIONS, dropdownLabels, dropdownShowing, servePartnerOptions, searchDropdown } from '../../mocks/partnerOptions'
import { cleanup, renderWithProviders, screen, waitFor } from '../../test-utils'
import { useAuthStore } from '../../../src/store/auth/authStore'
import CommissionList from '../../../src/pages/commissions/CommissionList'

/** The Commissions screen's partner filter: every partner, for the host only. */
describe('CommissionList › partner filter', () => {
  afterEach(() => {
    cleanup()
    server.resetHandlers()
    useAuthStore.setState({ token: undefined, user: null })
  })

  it('lists every partner from the options endpoint', async () => {
    useAuthStore.setState({ token: 'tok', user: { id: 1, name: 'Host', is_host: 1, entity_type: 'Partner', permissions: ['view commission'] } })
    const calls = servePartnerOptions()
    const user = userEvent.setup()
    renderWithProviders(<CommissionList />, { route: '/commissions' })

    const labels = await dropdownLabels(user, await dropdownShowing('Select Partner'))

    expect(labels).toEqual(PARTNER_OPTIONS.map((p) => `${p.company_name} (${p.full_name})`))
    expect(calls.options).toBe(1)
    expect(calls.fetchPartnersBodies).toHaveLength(0)
  })

  it('searches the partner filter', async () => {
    useAuthStore.setState({ token: 'tok', user: { id: 1, name: 'Host', is_host: 1, entity_type: 'Partner', permissions: ['view commission'] } })
    servePartnerOptions()
    const user = userEvent.setup()
    renderWithProviders(<CommissionList />, { route: '/commissions' })

    expect(await searchDropdown(user, await dropdownShowing('Select Partner'), 'Company 12')).toEqual(['Company 12 (Partner 12)'])
  })

  it('does not load partners for a white-label or certified partner', async () => {
    useAuthStore.setState({ token: 'tok', user: { id: 2, name: 'WLP', is_host: 0, entity_type: 'Partner', permissions: ['view commission'] } })
    const calls = servePartnerOptions()
    renderWithProviders(<CommissionList />, { route: '/commissions' })

    await waitFor(() => expect(document.querySelector('.p-datatable, table')).not.toBeNull())
    expect(screen.queryAllByText('Select Partner')).toHaveLength(0)
    expect(calls.options).toBe(0)
  })
})
