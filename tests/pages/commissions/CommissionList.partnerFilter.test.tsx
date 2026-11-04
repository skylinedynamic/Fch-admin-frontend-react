import { afterEach, describe, expect, it } from 'vitest'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
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

  // BUG-022 round 2 (R2-OP-COMM-05): Wanda, older than the ten newest partners,
  // could not be found or picked. A partner past the first ten, found by the
  // person's name, must filter the list.
  it('filters the list by a partner found past the first ten', async () => {
    useAuthStore.setState({ token: 'tok', user: { id: 1, name: 'Host', is_host: 1, entity_type: 'Partner', permissions: ['view commission'] } })
    servePartnerOptions()
    const listBodies: Record<string, unknown>[] = []
    server.use(
      http.post('*/common/commissions', async ({ request }) => {
        listBodies.push((await request.json()) as Record<string, unknown>)
        return HttpResponse.json({ status: true, message: 'ok', data: [], meta: { total: 0 }, statistics: {} })
      })
    )
    const user = userEvent.setup()
    renderWithProviders(<CommissionList />, { route: '/commissions' })

    const [label] = await searchDropdown(user, await dropdownShowing('Select Partner'), 'Partner 12')
    await user.click(screen.getByText(label, { selector: '.p-dropdown-panel .p-dropdown-item, .p-dropdown-panel .p-dropdown-item *' }))
    await user.click(screen.getByRole('button', { name: /filters/i }))

    await waitFor(() => expect(listBodies[listBodies.length - 1]).toMatchObject({ partner_id: 12 }))
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
