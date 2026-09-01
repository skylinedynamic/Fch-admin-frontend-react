import { afterEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { server } from '../../mocks/server'
import { createTestQueryClient } from '../../test-utils'
import { useDashboardData, DASHBOARD_QUERIES } from '../../../src/modules/dashboard/queries'

afterEach(() => server.resetHandlers())

describe('useDashboardData', () => {
  it('uses the ["dashboard", "data"] query key and returns the fetched summary', async () => {
    server.use(
      http.get('*/common/dashboard', () =>
        HttpResponse.json({
          status: true,
          message: 'ok',
          data: {
            counts: { total_partners: 1, total_clients: 2, total_leads: 3, total_commission: 4, funding_application: 5 },
            upcoming_meetings: [],
            latest_funding_applications: [],
            latest_pre_qualifications: [],
            latest_leads: [],
          },
        })
      )
    )

    expect(DASHBOARD_QUERIES.data).toEqual(['dashboard', 'data'])

    const queryClient = createTestQueryClient()
    const { result } = renderHook(() => useDashboardData(), {
      wrapper: ({ children }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>,
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.data.counts.total_clients).toBe(2)
    expect(queryClient.getQueryData(DASHBOARD_QUERIES.data)).toBeDefined()
  })
})
