import { afterEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { server } from '../../mocks/server'
import { createTestQueryClient } from '../../test-utils'
import { useChangeRequests, useUpdateChangeRequestStatus } from '../../../src/modules/change-request/queries'

afterEach(() => server.resetHandlers())

const wrapperFor = (queryClient: ReturnType<typeof createTestQueryClient>) =>
  ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )

describe('useChangeRequests', () => {
  it('fetches and keys the query by the given params', async () => {
    server.use(
      http.post('*/admin/change-requests', () =>
        HttpResponse.json({ status: true, message: 'ok', data: [], meta: { total: 0, per_page: 10, current_page: 1, last_page: 1 } })
      )
    )
    const queryClient = createTestQueryClient()
    const { result } = renderHook(() => useChangeRequests({ status: 'pending' }), { wrapper: wrapperFor(queryClient) })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(queryClient.getQueryCache().find({ queryKey: ['change-requests', { status: 'pending' }] })).toBeTruthy()
  })
})

describe('useUpdateChangeRequestStatus', () => {
  it('invalidates the change-requests list cache on success', async () => {
    server.use(
      http.patch('*/admin/change-requests/3', () =>
        HttpResponse.json({
          status: true,
          message: 'updated',
          data: {
            id: 3,
            partner_id: null,
            borrower_id: 1,
            field_name: 'phone',
            old_value: '1',
            new_value: '2',
            status: 'Rejected',
            updated_by: 1,
            note: null,
            created_at: '2026-01-01',
            updated_at: '2026-01-01',
            borrower_business_name: null,
            borrower_first_name: null,
            borrower_last_name: null,
            updater_name: null,
          },
        })
      )
    )
    const queryClient = createTestQueryClient()
    const invalidated: unknown[][] = []
    const original = queryClient.invalidateQueries.bind(queryClient)
    queryClient.invalidateQueries = (opts: any) => {
      invalidated.push(opts.queryKey)
      return original(opts)
    }

    const { result } = renderHook(() => useUpdateChangeRequestStatus(), { wrapper: wrapperFor(queryClient) })
    result.current.mutate({ id: 3, payload: { status: 'Rejected' } })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(invalidated).toContainEqual(['change-requests'])
  })
})
