import { afterEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../../mocks/server'
import { ownerSummaryResponse } from '../../mocks/ownerSummary'
import { getOwnerReportSettings, getOwnerSummary, updateOwnerReportSettings } from '../../../src/modules/owner-summary/services'
import { OWNER_SUMMARY_PERIOD } from '../../../src/config/ownerSummary'

afterEach(() => server.resetHandlers())

describe('getOwnerSummary', () => {
  it('asks GET /common/owner-summary for the period and returns the envelope', async () => {
    let query: URLSearchParams | null = null
    server.use(
      http.get('*/common/owner-summary', ({ request }) => {
        query = new URL(request.url).searchParams
        return HttpResponse.json(ownerSummaryResponse())
      })
    )

    const response = await getOwnerSummary({ period: OWNER_SUMMARY_PERIOD.LAST_MONTH })

    expect(query!.get('period')).toBe('last_month')
    expect(response.data.kpis.cash_collected.current).toBe(1550)
  })

  it('sends the dates of a custom range', async () => {
    let query: URLSearchParams | null = null
    server.use(
      http.get('*/common/owner-summary', ({ request }) => {
        query = new URL(request.url).searchParams
        return HttpResponse.json(ownerSummaryResponse())
      })
    )

    await getOwnerSummary({ period: OWNER_SUMMARY_PERIOD.CUSTOM, from: '2026-10-01', to: '2026-10-31' })

    expect(query!.get('period')).toBe('custom')
    expect(query!.get('from')).toBe('2026-10-01')
    expect(query!.get('to')).toBe('2026-10-31')
  })
})

describe('report settings', () => {
  it('reads them with GET /common/owner-summary/report-settings', async () => {
    server.use(
      http.get('*/common/owner-summary/report-settings', () =>
        HttpResponse.json({ status: true, message: 'ok', data: { enabled: true, recipients: ['owner@example.test'] } })
      )
    )

    const response = await getOwnerReportSettings()

    expect(response.data).toEqual({ enabled: true, recipients: ['owner@example.test'] })
  })

  it('saves them with PUT /common/owner-summary/report-settings', async () => {
    let body: unknown = null
    server.use(
      http.put('*/common/owner-summary/report-settings', async ({ request }) => {
        body = await request.json()
        return HttpResponse.json({ status: true, message: 'Report settings saved', data: body })
      })
    )

    const response = await updateOwnerReportSettings({ enabled: false, recipients: ['finance@example.test'] })

    expect(body).toEqual({ enabled: false, recipients: ['finance@example.test'] })
    expect(response.message).toBe('Report settings saved')
  })
})
