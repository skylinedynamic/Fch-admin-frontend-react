import { afterEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { server } from '../../mocks/server'
import { createTestQueryClient } from '../../test-utils'
import { usePartnerOptions } from '../../../src/modules/partner/queries'
import { queryKeys } from '../../../src/lib/query/queryKeys'

afterEach(() => server.resetHandlers())

const wrap = (queryClient = createTestQueryClient()) => ({
  queryClient,
  wrapper: ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  ),
})

const OPTIONS = [
  { id: 1, full_name: 'Mia Host', company_name: 'Host Co' },
  { id: 2, full_name: 'Wil Label', company_name: 'WLP Co' },
]

describe('usePartnerOptions', () => {
  it('does not fetch when disabled', () => {
    const { wrapper } = wrap()
    const { result } = renderHook(() => usePartnerOptions(false), { wrapper })

    expect(result.current.fetchStatus).toBe('idle')
  })

  it('loads every partner, cached under the partner options key', async () => {
    server.use(http.post('*/common/get-all-partners', () => HttpResponse.json({ status: true, message: 'ok', data: OPTIONS })))
    const { wrapper, queryClient } = wrap()
    const { result } = renderHook(() => usePartnerOptions(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(OPTIONS)
    expect(queryClient.getQueryData(queryKeys.partner.options())).toEqual(OPTIONS)
  })

  it('shares one request between the dropdowns using it', async () => {
    let calls = 0
    server.use(http.post('*/common/get-all-partners', () => {
      calls++
      return HttpResponse.json({ status: true, message: 'ok', data: OPTIONS })
    }))
    const { wrapper } = wrap()
    const first = renderHook(() => usePartnerOptions(), { wrapper })
    await waitFor(() => expect(first.result.current.isSuccess).toBe(true))

    const second = renderHook(() => usePartnerOptions(), { wrapper })

    expect(second.result.current.data).toEqual(OPTIONS)
    expect(calls).toBe(1)
  })
})
