import { afterEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../../mocks/server'
import { cleanup, renderWithProviders, screen } from '../../test-utils'
import { useAuthStore } from '../../../src/store/auth/authStore'
import CommissionList from '../../../src/pages/commissions/CommissionList'

/** The Commissions screen's summary cards, as a white-label/certified partner sees them. */
describe('CommissionList › cards', () => {
  afterEach(() => {
    cleanup()
    server.resetHandlers()
    useAuthStore.setState({ token: undefined, user: null })
  })

  it('shows a partner the completed deals, not every deal', async () => {
    useAuthStore.setState({ token: 'tok', user: { id: 2, name: 'WLP', is_host: 0, entity_type: 'Partner', permissions: ['view commission'] } })
    server.use(
      http.post('*/common/commissions', () =>
        HttpResponse.json({
          status: true,
          data: [],
          meta: { total: 0, current_page: 1, last_page: 1, per_page: 10 },
          statistics: { total_commission_amount: '0', avg_commission_rate: 0, total_deals: 7, completed_deals: 3, total_funded_amount: 0 },
        })
      ),
      // Everything else the page loads (filters, options) answers empty.
      http.all('*', () => HttpResponse.json({ status: true, data: [] }))
    )
    renderWithProviders(<CommissionList />, { route: '/commissions' })

    const card = (await screen.findByText('Completed Deals')).closest('.card') as HTMLElement
    expect(card).toHaveTextContent('3')
    expect(screen.queryByText('Total Deals')).toBeNull()
  })
})
