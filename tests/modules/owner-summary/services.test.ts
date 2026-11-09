import { afterEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../../mocks/server'
import { ownerSummaryResponse } from '../../mocks/ownerSummary'
import { getOwnerSummary } from '../../../src/modules/owner-summary/services'
import { OWNER_SUMMARY_ENVIRONMENT, OWNER_SUMMARY_PERIOD } from '../../../src/config/ownerSummary'

afterEach(() => server.resetHandlers())

describe('getOwnerSummary', () => {
  it('asks GET /common/owner-summary for the period and environment and returns the envelope', async () => {
    let query: URLSearchParams | null = null
    server.use(
      http.get('*/common/owner-summary', ({ request }) => {
        query = new URL(request.url).searchParams
        return HttpResponse.json(ownerSummaryResponse())
      })
    )

    const response = await getOwnerSummary({
      period: OWNER_SUMMARY_PERIOD.LAST_MONTH,
      environment: OWNER_SUMMARY_ENVIRONMENT.SANDBOX,
    })

    expect(query!.get('period')).toBe('last_month')
    expect(query!.get('environment')).toBe('sandbox')
    expect(response.data.kpis.cash_collected.current).toBe(1550)
  })
})
