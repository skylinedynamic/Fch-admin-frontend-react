import { afterEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../../mocks/server'
import { getDashboardData } from '../../../src/modules/dashboard/services'
import type { DashboardResponse } from '../../../src/modules/dashboard/types'

afterEach(() => server.resetHandlers())

const dashboardResponse: DashboardResponse = {
  status: true,
  message: 'ok',
  data: {
    counts: {
      total_partners: 3,
      total_clients: 12,
      total_leads: 5,
      total_commission: 100,
      funding_application: 2,
    },
    upcoming_meetings: [],
    latest_funding_applications: [],
    latest_pre_qualifications: [],
    latest_leads: [],
  },
}

describe('getDashboardData', () => {
  it('GETs the dashboard summary and returns the raw response body', async () => {
    server.use(http.get('*/common/dashboard', () => HttpResponse.json(dashboardResponse)))

    await expect(getDashboardData()).resolves.toEqual(dashboardResponse)
  })
})
