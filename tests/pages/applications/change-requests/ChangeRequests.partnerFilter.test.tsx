import { afterEach, describe, expect, it } from 'vitest'
import userEvent from '@testing-library/user-event'
import { server } from '../../../mocks/server'
import { PARTNER_OPTIONS, dropdownLabels, dropdownShowing, servePartnerOptions, searchDropdown } from '../../../mocks/partnerOptions'
import { cleanup, renderWithProviders, waitFor } from '../../../test-utils'
import { useAuthStore } from '../../../../src/store/auth/authStore'
import ChangeRequests from '../../../../src/pages/applications/change-requests/ChangeRequests'

/**
 * The Change Requests partner filter: every partner for the host. A partner
 * can open the screen too, but the partner list is the host's only.
 */
describe('ChangeRequests › partner filter', () => {
  afterEach(() => {
    cleanup()
    server.resetHandlers()
    useAuthStore.setState({ token: undefined, user: null })
  })

  it('lists every partner from the options endpoint, beyond the old cap', async () => {
    useAuthStore.setState({ token: 'tok', user: { id: 1, name: 'Host', is_host: 1, entity_type: 'Partner', permissions: ['view change requests'] } })
    const calls = servePartnerOptions()
    const user = userEvent.setup()
    renderWithProviders(<ChangeRequests />, { route: '/intake-review/change-requests' })

    const labels = await dropdownLabels(user, await dropdownShowing('All Partners'))

    expect(labels).toEqual(['All Partners', ...PARTNER_OPTIONS.map((p) => `${p.company_name} (${p.full_name})`)])
    expect(calls.options).toBe(1)
    expect(calls.fetchPartnersBodies).toHaveLength(0)
  })

  it('searches the partner filter', async () => {
    useAuthStore.setState({ token: 'tok', user: { id: 1, name: 'Host', is_host: 1, entity_type: 'Partner', permissions: ['view change requests'] } })
    servePartnerOptions()
    const user = userEvent.setup()
    renderWithProviders(<ChangeRequests />, { route: '/intake-review/change-requests' })

    expect(await searchDropdown(user, await dropdownShowing('All Partners'), 'Company 12')).toEqual(['Company 12 (Partner 12)'])
  })

  it('does not ask for the host-only partner list as a white-label or certified partner', async () => {
    useAuthStore.setState({ token: 'tok', user: { id: 2, name: 'WLP', is_host: 0, entity_type: 'Partner', permissions: ['view change requests'] } })
    const calls = servePartnerOptions()
    renderWithProviders(<ChangeRequests />, { route: '/intake-review/change-requests' })

    await dropdownShowing('All Partners')
    await waitFor(() => expect(document.querySelector('.p-datatable, table')).not.toBeNull())
    expect(calls.options).toBe(0)
    expect(calls.fetchPartnersBodies).toHaveLength(0)
  })
})
