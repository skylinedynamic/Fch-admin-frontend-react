import { afterEach, describe, expect, it } from 'vitest'
import userEvent from '@testing-library/user-event'
import { server } from '../../mocks/server'
import { PARTNER_OPTIONS, dropdownLabels, dropdownShowing, servePartnerOptions, searchDropdown } from '../../mocks/partnerOptions'
import { cleanup, renderWithProviders, waitFor } from '../../test-utils'
import { useAuthStore } from '../../../src/store/auth/authStore'
import Partners from '../../../src/pages/partners/Partners'

/**
 * The Partners screen: its table pages through /admin/partners/fetch-partners,
 * while its Partner filter lists every partner from /common/get-all-partners.
 */
describe('Partners › partner filter', () => {
  afterEach(() => {
    cleanup()
    server.resetHandlers()
    useAuthStore.setState({ token: undefined, user: null })
  })

  it('lists every partner, by name, from the options endpoint', async () => {
    useAuthStore.setState({ token: 'tok', user: { id: 1, name: 'Host', is_host: 1, entity_type: 'Partner', permissions: ['view partners'] } })
    const calls = servePartnerOptions()
    const user = userEvent.setup()
    renderWithProviders(<Partners />, { route: '/partners' })

    const labels = await dropdownLabels(user, await dropdownShowing('All Partners'))

    expect(labels).toEqual(['All Partners', ...PARTNER_OPTIONS.map((p) => `${p.company_name} (${p.full_name})`)])
    expect(calls.options).toBe(1)
  })

  it('searches the partner filter', async () => {
    useAuthStore.setState({ token: 'tok', user: { id: 1, name: 'Host', is_host: 1, entity_type: 'Partner', permissions: ['view partners'] } })
    servePartnerOptions()
    const user = userEvent.setup()
    renderWithProviders(<Partners />, { route: '/partners' })

    expect(await searchDropdown(user, await dropdownShowing('All Partners'), 'Company 12')).toEqual(['Company 12 (Partner 12)'])
  })

  it('keeps paging its table through fetch-partners, which no longer feeds the filter', async () => {
    useAuthStore.setState({ token: 'tok', user: { id: 1, name: 'Host', is_host: 1, entity_type: 'Partner', permissions: ['view partners'] } })
    const calls = servePartnerOptions()
    renderWithProviders(<Partners />, { route: '/partners' })

    await waitFor(() => expect(calls.fetchPartnersBodies.length).toBeGreaterThan(0))
    expect(calls.fetchPartnersBodies.every((body) => 'page' in body && 'per_page' in body)).toBe(true)
  })
})
