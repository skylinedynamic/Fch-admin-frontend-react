import { afterEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { server } from '../../mocks/server'
import { createTestQueryClient } from '../../test-utils'
import { useAgreement, useAgreements, useSaveAgreement, useToggleAgreementStatus } from '../../../src/modules/agreement/queries'
import { queryKeys } from '../../../src/lib/query/queryKeys'

afterEach(() => server.resetHandlers())

const wrap = (queryClient = createTestQueryClient()) => ({
  queryClient,
  wrapper: ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  ),
})

describe('useAgreement', () => {
  it('does not fetch when disabled', () => {
    const { wrapper } = wrap()
    const { result } = renderHook(() => useAgreement('partner', false), { wrapper })
    expect(result.current.fetchStatus).toBe('idle')
  })

  it('fetches the agreement by slug when enabled', async () => {
    server.use(
      http.post('*/common/agreement-templates/show', () =>
        HttpResponse.json({ status: true, message: 'ok', data: { id: 1, slug: 'partner' } })
      )
    )
    const { wrapper } = wrap()
    const { result } = renderHook(() => useAgreement('partner'), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.data?.slug).toBe('partner')
  })
})

describe('useAgreements', () => {
  it('fetches the full template list', async () => {
    server.use(
      http.get('*/common/agreement-templates', () =>
        HttpResponse.json({ status: true, message: 'ok', data: [{ id: 1, slug: 'borrower' }] })
      )
    )
    const { wrapper } = wrap()
    const { result } = renderHook(() => useAgreements(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.data).toHaveLength(1)
  })
})

describe('useSaveAgreement', () => {
  it('invalidates the slug detail and the full list when the save succeeds (status: true)', async () => {
    server.use(
      http.post('*/common/agreement-templates/save', () =>
        HttpResponse.json({ status: true, message: 'Saved', data: { id: 1, slug: 'partner' } })
      )
    )
    const { queryClient, wrapper } = wrap()
    const invalidated: unknown[][] = []
    const original = queryClient.invalidateQueries.bind(queryClient)
    queryClient.invalidateQueries = (opts: any) => {
      invalidated.push(opts.queryKey)
      return original(opts)
    }

    const { result } = renderHook(() => useSaveAgreement(), { wrapper })
    result.current.mutate({ slug: 'partner', template_html: '<p/>' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(invalidated).toContainEqual(queryKeys.agreement.detail('partner'))
    expect(invalidated).toContainEqual(queryKeys.agreement.all)
  })

  it('does not invalidate any cache when the backend responds with status: false', async () => {
    server.use(
      http.post('*/common/agreement-templates/save', () =>
        HttpResponse.json({ status: false, message: 'Validation failed' })
      )
    )
    const { queryClient, wrapper } = wrap()
    const invalidated: unknown[][] = []
    const original = queryClient.invalidateQueries.bind(queryClient)
    queryClient.invalidateQueries = (opts: any) => {
      invalidated.push(opts.queryKey)
      return original(opts)
    }

    const { result } = renderHook(() => useSaveAgreement(), { wrapper })
    result.current.mutate({ slug: 'partner' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(invalidated).toEqual([])
  })
})

describe('useToggleAgreementStatus', () => {
  it('invalidates the slug detail and the full list on a successful toggle', async () => {
    server.use(
      http.post('*/common/agreement-templates/update-status/1', () =>
        HttpResponse.json({ status: true, message: 'Updated', data: { id: 1, slug: 'borrower', is_active: false } })
      )
    )
    const { queryClient, wrapper } = wrap()
    const invalidated: unknown[][] = []
    const original = queryClient.invalidateQueries.bind(queryClient)
    queryClient.invalidateQueries = (opts: any) => {
      invalidated.push(opts.queryKey)
      return original(opts)
    }

    const { result } = renderHook(() => useToggleAgreementStatus(), { wrapper })
    result.current.mutate({ id: 1, slug: 'borrower', is_active: false })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(invalidated).toContainEqual(queryKeys.agreement.detail('borrower'))
    expect(invalidated).toContainEqual(queryKeys.agreement.all)
  })
})
