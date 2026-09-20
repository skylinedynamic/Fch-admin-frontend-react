import { afterEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { server } from '../../mocks/server'
import { createTestQueryClient } from '../../test-utils'
import {
  useCapitalAccounts,
  useCapitalAccount,
  useCreateCapitalAccount,
  useUpdateCapitalAccount,
  useDeleteCapitalAccount,
  useUpdateCapitalAccountStatus,
} from '../../../src/modules/capital-access/queries'

afterEach(() => server.resetHandlers())

const wrapperFor = (queryClient: ReturnType<typeof createTestQueryClient>) =>
  ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )

describe('useCapitalAccount', () => {
  it('does not fetch when no id is provided', () => {
    const queryClient = createTestQueryClient()
    const { result } = renderHook(() => useCapitalAccount(''), { wrapper: wrapperFor(queryClient) })

    expect(result.current.fetchStatus).toBe('idle')
  })

  it('fetches once an id is provided', async () => {
    server.use(
      http.get('*/common/capital-accesses/1', () =>
        HttpResponse.json({ status: true, message: 'ok', data: { id: 1, name: 'Program A', status: 'active' } })
      )
    )
    const queryClient = createTestQueryClient()
    const { result } = renderHook(() => useCapitalAccount(1), { wrapper: wrapperFor(queryClient) })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.data.name).toBe('Program A')
  })
})

describe('useCapitalAccounts', () => {
  it('keys the query by the payload so different filters get different cache entries', async () => {
    server.use(
      http.post('*/common/capital-accesses/fetch-all', () =>
        HttpResponse.json({ status: true, message: 'ok', data: [] })
      )
    )
    const queryClient = createTestQueryClient()
    const { result } = renderHook(() => useCapitalAccounts({ search: 'abc' }), { wrapper: wrapperFor(queryClient) })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(queryClient.getQueryCache().find({ queryKey: ['capital-accesses', { search: 'abc' }] })).toBeTruthy()
  })
})

const trackInvalidations = (queryClient: ReturnType<typeof createTestQueryClient>) => {
  const invalidated: unknown[][] = []
  const original = queryClient.invalidateQueries.bind(queryClient)
  queryClient.invalidateQueries = (opts: any) => {
    invalidated.push(opts.queryKey)
    return original(opts)
  }
  return invalidated
}

describe('useCreateCapitalAccount', () => {
  it('invalidates the list cache on success', async () => {
    server.use(
      http.post('*/common/capital-accesses', () =>
        HttpResponse.json({ status: true, message: 'created', data: { id: 1, name: 'New', status: 'draft' } })
      )
    )
    const queryClient = createTestQueryClient()
    const invalidated = trackInvalidations(queryClient)
    const { result } = renderHook(() => useCreateCapitalAccount(), { wrapper: wrapperFor(queryClient) })

    result.current.mutate({
      name: 'New',
      sub_title: '',
      target_exposure_min: 0,
      target_exposure_max: 0,
      est_timeline_min: 0,
      est_timeline_max: 0,
      what_you_will_get: [],
      pre_flight_checklist: [],
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(invalidated).toContainEqual(['capital-accesses'])
  })
})

describe('useUpdateCapitalAccount', () => {
  it('invalidates both the list and the single-item cache on success', async () => {
    server.use(
      http.put('*/common/capital-accesses/2', () =>
        HttpResponse.json({ status: true, message: 'updated', data: { id: 2, name: 'Upd', status: 'active' } })
      )
    )
    const queryClient = createTestQueryClient()
    const invalidated = trackInvalidations(queryClient)
    const { result } = renderHook(() => useUpdateCapitalAccount(), { wrapper: wrapperFor(queryClient) })

    result.current.mutate({
      id: 2,
      payload: {
        name: 'Upd',
        sub_title: '',
        target_exposure_min: 0,
        target_exposure_max: 0,
        est_timeline_min: 0,
        est_timeline_max: 0,
        what_you_will_get: [],
        pre_flight_checklist: [],
      },
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(invalidated).toContainEqual(['capital-accesses'])
    expect(invalidated).toContainEqual(['capital-access'])
  })
})

describe('useDeleteCapitalAccount', () => {
  it('invalidates the list cache on success', async () => {
    server.use(http.delete('*/common/capital-accesses/9', () => HttpResponse.json({ status: true, message: 'deleted' })))
    const queryClient = createTestQueryClient()
    const invalidated = trackInvalidations(queryClient)
    const { result } = renderHook(() => useDeleteCapitalAccount(), { wrapper: wrapperFor(queryClient) })

    result.current.mutate(9)

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(invalidated).toContainEqual(['capital-accesses'])
  })
})

describe('useUpdateCapitalAccountStatus', () => {
  it('invalidates both the list and the single-item cache on success', async () => {
    server.use(
      http.patch('*/common/capital-accesses/6/status', () =>
        HttpResponse.json({ status: true, message: 'ok', data: { id: 6, name: 'X', status: 'inactive' } })
      )
    )
    const queryClient = createTestQueryClient()
    const invalidated = trackInvalidations(queryClient)
    const { result } = renderHook(() => useUpdateCapitalAccountStatus(), { wrapper: wrapperFor(queryClient) })

    result.current.mutate({ id: 6, status: 'inactive' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(invalidated).toContainEqual(['capital-accesses'])
    expect(invalidated).toContainEqual(['capital-access'])
  })
})
