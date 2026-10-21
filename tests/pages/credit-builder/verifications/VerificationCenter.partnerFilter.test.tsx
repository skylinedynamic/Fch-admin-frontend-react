import { afterEach, describe, expect, it } from 'vitest'
import userEvent from '@testing-library/user-event'
import { server } from '../../../mocks/server'
import { PARTNER_OPTIONS, dropdownLabels, dropdownShowing, servePartnerOptions, searchDropdown } from '../../../mocks/partnerOptions'
import { cleanup, renderWithProviders } from '../../../test-utils'
import { useAuthStore } from '../../../../src/store/auth/authStore'
import VerificationCenter from '../../../../src/pages/credit-builder/verifications/VerificationCenter'

/** The host's Verification Center partner filter: every partner, by name. */
describe('VerificationCenter › partner filter', () => {
  afterEach(() => {
    cleanup()
    server.resetHandlers()
    useAuthStore.setState({ token: undefined, user: null })
  })

  it('lists every partner from the options endpoint', async () => {
    useAuthStore.setState({ token: 'tok', user: { id: 1, name: 'Host', is_host: 1, entity_type: 'Partner', permissions: [] } })
    const calls = servePartnerOptions()
    const user = userEvent.setup()
    renderWithProviders(<VerificationCenter />, { route: '/verification-center' })

    const labels = await dropdownLabels(user, await dropdownShowing('All Partners'))

    expect(labels).toEqual(['All Partners', ...PARTNER_OPTIONS.map((p) => `${p.company_name} (${p.full_name})`)])
    expect(calls.options).toBe(1)
    expect(calls.fetchPartnersBodies).toHaveLength(0)
  })

  it('searches the partner filter', async () => {
    useAuthStore.setState({ token: 'tok', user: { id: 1, name: 'Host', is_host: 1, entity_type: 'Partner', permissions: [] } })
    servePartnerOptions()
    const user = userEvent.setup()
    renderWithProviders(<VerificationCenter />, { route: '/verification-center' })

    expect(await searchDropdown(user, await dropdownShowing('All Partners'), 'Company 12')).toEqual(['Company 12 (Partner 12)'])
  })
})
