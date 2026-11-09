import { afterEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { server } from '../../mocks/server'
import { ownerSummaryResponse } from '../../mocks/ownerSummary'
import { createTestQueryClient } from '../../test-utils'
import {
  OWNER_SUMMARY_QUERIES,
  useOwnerReportSettings,
  useOwnerSummary,
  useUpdateOwnerReportSettings,
} from '../../../src/modules/owner-summary/queries'
import { OWNER_SUMMARY_PERIOD } from '../../../src/config/ownerSummary'

afterEach(() => server.resetHandlers())

const wrapperFor = (queryClient: QueryClient) =>
  ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>

describe('useOwnerSummary', () => {
  it('keys the summary by period', async () => {
    server.use(http.get('*/common/owner-summary', () => HttpResponse.json(ownerSummaryResponse())))

    const params = { period: OWNER_SUMMARY_PERIOD.THIS_MONTH }
    const queryClient = createTestQueryClient()
    const { result } = renderHook(() => useOwnerSummary(params), { wrapper: wrapperFor(queryClient) })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(OWNER_SUMMARY_QUERIES.summary(params)).toEqual(['owner-summary', 'this_month', null, null, null])
    expect(queryClient.getQueryData(OWNER_SUMMARY_QUERIES.summary(params))).toBeDefined()
    expect(result.current.data?.kpis.funded.amount).toBe(150000)
  })

  it('keys a custom range by its dates', () => {
    const custom = { period: OWNER_SUMMARY_PERIOD.CUSTOM, from: '2026-10-01', to: '2026-10-31' }

    expect(OWNER_SUMMARY_QUERIES.summary(custom)).toEqual(['owner-summary', 'custom', '2026-10-01', '2026-10-31', null])
    // Each payments mode is its own result: switching must not show another mode's numbers as current.
    expect(OWNER_SUMMARY_QUERIES.summary({ period: 'this_month', environment: 'sandbox' })).toEqual(['owner-summary', 'this_month', null, null, 'sandbox'])
  })

  const requestsFor = async (status: number) => {
    let requests = 0
    server.use(
      http.get('*/common/owner-summary', () => {
        requests += 1
        return HttpResponse.json({ message: 'x' }, { status })
      })
    )
    const queryClient = new QueryClient({ defaultOptions: { queries: { retryDelay: 0 } } })
    const { result } = renderHook(() => useOwnerSummary({ period: OWNER_SUMMARY_PERIOD.THIS_MONTH }), { wrapper: wrapperFor(queryClient) })

    await waitFor(() => expect(result.current.isError).toBe(true))
    return requests
  }

  it('does not ask again after the API refuses a range', async () => {
    expect(await requestsFor(422)).toBe(1)
  })

  it('still tries a failed request once more', async () => {
    expect(await requestsFor(500)).toBe(2)
  })
})

describe('report settings hooks', () => {
  it('does not ask until told to', async () => {
    let asked = 0
    server.use(http.get('*/common/owner-summary/report-settings', () => {
      asked += 1
      return HttpResponse.json({ status: true, message: 'ok', data: { enabled: false, recipients: [] } })
    }))
    const queryClient = createTestQueryClient()

    const { result, rerender } = renderHook(({ open }) => useOwnerReportSettings(open), {
      wrapper: wrapperFor(queryClient),
      initialProps: { open: false },
    })
    expect(asked).toBe(0)

    rerender({ open: true })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(asked).toBe(1)
    expect(result.current.data).toEqual({ enabled: false, recipients: [] })
  })

  it('remembers what was saved', async () => {
    server.use(http.put('*/common/owner-summary/report-settings', async ({ request }) =>
      HttpResponse.json({ status: true, message: 'Report settings saved', data: await request.json() })
    ))
    const queryClient = createTestQueryClient()
    const { result } = renderHook(() => useUpdateOwnerReportSettings(), { wrapper: wrapperFor(queryClient) })

    await act(() => result.current.mutateAsync({ enabled: true, recipients: ['owner@example.test'] }))

    expect(queryClient.getQueryData(OWNER_SUMMARY_QUERIES.reportSettings)).toEqual({ enabled: true, recipients: ['owner@example.test'] })
  })
})
