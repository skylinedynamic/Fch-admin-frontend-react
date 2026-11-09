import { afterEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { server } from '../../mocks/server'
import { ownerSummaryResponse } from '../../mocks/ownerSummary'
import { createTestQueryClient } from '../../test-utils'
import { OWNER_SUMMARY_QUERIES, useOwnerSummary } from '../../../src/modules/owner-summary/queries'
import { OWNER_SUMMARY_ENVIRONMENT, OWNER_SUMMARY_PERIOD } from '../../../src/config/ownerSummary'

afterEach(() => server.resetHandlers())

describe('useOwnerSummary', () => {
  it('keys the summary by period and environment', async () => {
    server.use(http.get('*/common/owner-summary', () => HttpResponse.json(ownerSummaryResponse())))

    const params = { period: OWNER_SUMMARY_PERIOD.THIS_MONTH, environment: OWNER_SUMMARY_ENVIRONMENT.PRODUCTION }
    const queryClient = createTestQueryClient()
    const { result } = renderHook(() => useOwnerSummary(params), {
      wrapper: ({ children }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>,
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(OWNER_SUMMARY_QUERIES.summary(params)).toEqual(['owner-summary', 'this_month', 'production'])
    expect(queryClient.getQueryData(OWNER_SUMMARY_QUERIES.summary(params))).toBeDefined()
    expect(result.current.data?.kpis.funded.amount).toBe(150000)
  })
})
