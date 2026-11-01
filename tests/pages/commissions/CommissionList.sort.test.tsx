import { afterEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import userEvent from '@testing-library/user-event'
import { server } from '../../mocks/server'
import { cleanup, renderWithProviders, screen, waitFor } from '../../test-utils'
import { useAuthStore } from '../../../src/store/auth/authStore'
import CommissionList from '../../../src/pages/commissions/CommissionList'

/**
 * BUG-073: the Date, Borrower and Partner headers sent their display fields
 * (date, borrower, partner) as sort_field - not columns the API sorts by, so
 * the list answered 500 and the page emptied. Each header now sends the sort
 * key the API knows.
 */
const ROW = {
  id: 1201, date: '2026/03/01', borrower: 'Johnathan Smithfield', partner: 'Acme Funding', commission_status: 'Completed',
  requested_amount: 100000, funded_amount: 90000, payment_status: 'Paid',
}

let bodies: Record<string, unknown>[] = []

const open = async () => {
  bodies = []
  useAuthStore.setState({ token: 'tok', user: { id: 2, name: 'Owner', entity_type: 'Partner', is_host: 1, permissions: ['view commission'] } })
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

const sortBy = async (header: string) => {
  const user = userEvent.setup()
  await user.click(screen.getByRole('columnheader', { name: header }))
  await waitFor(() => expect(bodies[bodies.length - 1]?.sort_field).toBeTruthy())
  return bodies[bodies.length - 1]
}

describe('CommissionList › sorting', () => {
  afterEach(() => {
    cleanup()
    server.resetHandlers()
    useAuthStore.setState({ token: undefined, user: null })
  })

  it.each([
    ['Date', 'created_at'],
    ['Borrower', 'borrower_name'],
    ['Partner', 'partner_name'],
    ['Requested Amount', 'requested_amount'],
    ['Funded Amount', 'funded_amount'],
    ['Status', 'commission_status'],
    ['Payment Status', 'payment_status'],
  ])('the %s header sorts by %s', async (header, key) => {
    await open()

    expect(await sortBy(header)).toMatchObject({ sort_field: key, sort_order: 'asc' })
  })
})
