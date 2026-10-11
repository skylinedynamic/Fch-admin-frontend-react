import { afterEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../../mocks/server'
import { getCommissions, getCommissionById, processPayout } from '../../../src/modules/commission/services'

afterEach(() => server.resetHandlers())

const listItem = {
  id: 1,
  funding_application_id: 10,
  total_commission: '100',
  admin_commission: '60',
  partner_commission: '40',
  total_commission_amount: '100.00',
  admin_commission_amount: '60.00',
  partner_commission_amount: '40.00',
  commission_status: 'pending',
  currency: 'USD',
  currency_symbol: '$',
  conversion_rate: '1',
  borrower: 'Jo Doe',
  partner: 'Partner Co',
  requested_amount: '1000',
  funded_amount: '1000',
  payment_status: 'unpaid',
  note: null,
  date: '2026-01-01',
}

describe('getCommissions', () => {
  it('POSTs filters and returns the single-unwrapped paginated envelope (response.data)', async () => {
    let receivedBody: unknown = null
    server.use(
      http.post('*/common/commissions', async ({ request }) => {
        receivedBody = await request.json()
        return HttpResponse.json({
          status: true,
          message: 'ok',
          data: [listItem],
          meta: { current_page: 1, last_page: 1, per_page: 10, total: 1 },
          statistics: {
            total_commission_amount: '100',
            avg_commission_rate: 10,
            total_deals: 1,
            partner_commission_amount: '40',
            total_funded_amount: 1000,
          },
        })
      })
    )

    const filters = { page: 1, per_page: 10 } as any
    const result = await getCommissions(filters)
    expect(receivedBody).toEqual(filters)
    expect(result.data).toEqual([listItem])
    expect(result.statistics.total_deals).toBe(1)
  })
})

describe('getCommissionById', () => {
  it('GETs by id and double-unwraps the envelope (response.data.data, not response.data)', async () => {
    const detail = {
      ...listItem,
      commission_payment_status: 'unpaid',
      payout_date: null,
      commission_note: null,
      borrower_id: 2,
      borrower_name: 'Jo Doe',
      borrower_business_name: 'Acme',
      borrower_business_email: 'jo@acme.com',
      borrower_business_phone_no: '555',
      borrower_business_country: 'US',
      borrower_business_address: '1 Main St',
      borrower_business_city: 'City',
      borrower_business_state: 'ST',
      business_postal_code: '00000',
      funding_requested_amount: '1000',
      funding_status: 'funded',
      funding_status_note: null,
      funding_industry_type: 'Retail',
      funding_entity_type: 'LLC',
      funding_purpose_of_funds: 'Growth',
      funding_preferred_funding_type: 'Line of Credit',
      funded_date: '2026-01-05',
      partner_id: 3,
      partner_name: 'P',
      partner_company_name: 'Partner Co',
      partner_email: 'p@x.com',
      partner_phone_number: '555',
      partner_type: 'referral',
    }
    server.use(
      http.get('*/common/commissions/9', () => HttpResponse.json({ status: true, message: 'ok', data: detail }))
    )

    const result = await getCommissionById(9)
    // Not the envelope — the inner commission object itself
    expect(result).toEqual(detail)
    expect((result as any).status).toBeUndefined()
  })
})

describe('processPayout', () => {
  it('POSTs the payout payload to the admin payout endpoint and returns the raw envelope', async () => {
    let receivedBody: unknown = null
    server.use(
      http.post('*/admin/commission/9/payout', async ({ request }) => {
        receivedBody = await request.json()
        return HttpResponse.json({ status: true, message: 'paid' })
      })
    )

    const result = await processPayout(9, { partner_payment_method: 'ach', note: 'paid out' })
    expect(receivedBody).toEqual({ partner_payment_method: 'ach', note: 'paid out' })
    expect(result).toEqual({ status: true, message: 'paid' })
  })
})
