import { afterEach, describe, expect, it } from 'vitest'
import userEvent from '@testing-library/user-event'
import { server } from '../../mocks/server'
import { PARTNER_OPTIONS, dropdownLabels, dropdownShowing, servePartnerOptions, searchDropdown } from '../../mocks/partnerOptions'
import { cleanup, renderWithProviders, screen, waitFor } from '../../test-utils'
import { useAuthStore } from '../../../src/store/auth/authStore'
import Clients from '../../../src/pages/clients/Clients'

/** The Clients screen's Partner filter: every partner, for the host only. */
describe('Clients › partner filter', () => {
  afterEach(() => {
    cleanup()
    server.resetHandlers()
    useAuthStore.setState({ token: undefined, user: null })
  })

  it('lists every partner from the options endpoint', async () => {
    useAuthStore.setState({ token: 'tok', user: { id: 1, name: 'Host', is_host: 1, entity_type: 'Partner', permissions: ['view clients'] } })
    const calls = servePartnerOptions()
    const user = userEvent.setup()
    renderWithProviders(<Clients />, { route: '/clients' })

    const labels = await dropdownLabels(user, await dropdownShowing('All Partners'))

    expect(labels).toEqual(['All Partners', ...PARTNER_OPTIONS.map((p) => `${p.company_name} (${p.full_name})`)])
    expect(calls.options).toBe(1)
    expect(calls.fetchPartnersBodies).toHaveLength(0)
  })

  it('searches the partner filter', async () => {
    useAuthStore.setState({ token: 'tok', user: { id: 1, name: 'Host', is_host: 1, entity_type: 'Partner', permissions: ['view clients'] } })
    servePartnerOptions()
    const user = userEvent.setup()
    renderWithProviders(<Clients />, { route: '/clients' })

    expect(await searchDropdown(user, await dropdownShowing('All Partners'), 'Company 12')).toEqual(['Company 12 (Partner 12)'])
  })

  it('does not load partners for a white-label or certified partner', async () => {
    useAuthStore.setState({ token: 'tok', user: { id: 2, name: 'WLP', is_host: 0, entity_type: 'Partner', permissions: ['view clients'] } })
    const calls = servePartnerOptions()
    renderWithProviders(<Clients />, { route: '/clients' })

    await waitFor(() => expect(document.querySelector('.p-datatable, table')).not.toBeNull())
    expect(screen.queryAllByText('All Partners')).toHaveLength(0)
    expect(calls.options).toBe(0)
  })
})
