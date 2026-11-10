import { afterEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import userEvent from '@testing-library/user-event'
import { server } from '../../mocks/server'
import { cleanup, renderWithProviders, screen, waitFor } from '../../test-utils'
import { useAuthStore } from '../../../src/store/auth/authStore'
import CommissionList from '../../../src/pages/commissions/CommissionList'

/**
 * Defect (BUG-162, PP-COMM-03): typing in "Search borrower or ID..." and
 * pressing Enter did nothing - only the Filters button applied the search,
 * unlike the Leads, Clients, Contacts and Upcoming Billings lists (BUG-006).
 * Enter applies it, for the host and for a partner.
 */
const ROW = {
  id: 1201, date: '2026/03/01', borrower: 'Johnathan Smithfield', partner: 'Acme Funding', commission_status: 'Completed',
  requested_amount: 100000, funded_amount: 90000, payment_status: 'Paid',
}

let bodies: Record<string, unknown>[] = []

const open = async (user: Record<string, unknown>) => {
  bodies = []
  useAuthStore.setState({ token: 'tok', user: { id: 2, name: 'Owner', permissions: ['view commission'], ...user } } as never)
  server.use(
    http.post('*/common/commissions', async ({ request }) => {
      bodies.push((await request.json()) as Record<string, unknown>)
      return HttpResponse.json({ status: true, data: [ROW], meta: { total: 1, current_page: 1, last_page: 1, per_page: 10 }, statistics: { viewer: 'host_owner' } })
    }),
    http.all('*', () => HttpResponse.json({ status: true, data: [] }))
  )
  renderWithProviders(<CommissionList />, { route: '/commissions' })
  await screen.findByText('Johnathan Smithfield')
}

describe('CommissionList › search on Enter', () => {
  afterEach(() => {
    cleanup()
    server.resetHandlers()
    useAuthStore.setState({ token: undefined, user: null })
  })

  it.each([
    ['the host', { entity_type: 'Partner', is_host: 1 }],
    ['a partner', { entity_type: 'Partner', is_host: 0, partner_id: 5 }],
  ])('Enter runs the search for %s', async (_who, user) => {
    const typist = userEvent.setup()
    await open(user)

    await typist.type(screen.getByPlaceholderText('Search borrower or ID...'), 'zzqxnomatch{Enter}')

    await waitFor(() => expect(String(bodies[bodies.length - 1]?.search ?? '')).toBe('zzqxnomatch'))
  })
})
