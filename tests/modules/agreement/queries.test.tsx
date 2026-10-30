import { afterEach, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { server } from '../../mocks/server'
import { createTestQueryClient } from '../../test-utils'
import { useAgreement, useAgreements, useSaveAgreement, useToggleAgreementStatus } from '../../../src/modules/agreement/queries'
import { queryKeys } from '../../../src/lib/query/queryKeys'
import { ConfigPartnerProvider } from '../../../src/modules/settings/configPartner'
import { REFRESH_ACTIVITIES_EVENT } from '../../../src/config/appConfig'

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

// Inside Partner profile › Configuration the hooks work on that partner's
// templates, cached apart from the host's own.
describe('inside a ConfigPartnerProvider', () => {
  const partnerWrap = (queryClient = createTestQueryClient()) => ({
    queryClient,
    wrapper: ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        <ConfigPartnerProvider partner={{ id: 42 }}>{children}</ConfigPartnerProvider>
      </QueryClientProvider>
    ),
  })

  it('reads the partner\'s templates and caches them apart from the user\'s own', async () => {
    let listParam: string | null = null
    let showBody: any = null
    server.use(
      http.get('*/common/agreement-templates', ({ request }) => {
        listParam = new URL(request.url).searchParams.get('partner_id')
        return HttpResponse.json({ status: true, data: [] })
      }),
      http.post('*/common/agreement-templates/show', async ({ request }) => {
        showBody = await request.json()
        return HttpResponse.json({ status: true, data: { id: 1, slug: 'borrower' } })
      })
    )
    const { wrapper, queryClient } = partnerWrap()

    const list = renderHook(() => useAgreements(), { wrapper })
    const detail = renderHook(() => useAgreement('borrower'), { wrapper })

    await waitFor(() => expect(list.result.current.isSuccess && detail.result.current.isSuccess).toBe(true))
    expect(listParam).toBe('42')
    expect(showBody).toEqual({ slug: 'borrower', partner_id: 42 })
    expect(queryClient.getQueryData(queryKeys.agreement.all)).toBeUndefined()
  })

  it('saves and toggles the partner\'s template and refreshes its activity', async () => {
    let saveBody: any = null
    let statusBody: any = null
    server.use(
      http.post('*/common/agreement-templates/save', async ({ request }) => {
        saveBody = await request.json()
        return HttpResponse.json({ status: true, data: { id: 1, slug: 'borrower' } })
      }),
      http.post('*/common/agreement-templates/update-status/1', async ({ request }) => {
        statusBody = await request.json()
        return HttpResponse.json({ status: true, data: { id: 1, slug: 'borrower' } })
      })
    )
    const refreshed = vi.fn()
    window.addEventListener(REFRESH_ACTIVITIES_EVENT, refreshed)
    const { wrapper } = partnerWrap()

    const save = renderHook(() => useSaveAgreement(), { wrapper })
    const toggle = renderHook(() => useToggleAgreementStatus(), { wrapper })
    await save.result.current.mutateAsync({ slug: 'borrower', template_html: '<p/>' })
    await toggle.result.current.mutateAsync({ id: 1, slug: 'borrower', is_active: false })

    expect(saveBody).toMatchObject({ slug: 'borrower', partner_id: 42 })
    expect(statusBody).toMatchObject({ is_active: false, partner_id: 42 })
    expect(refreshed).toHaveBeenCalledTimes(2)
    window.removeEventListener(REFRESH_ACTIVITIES_EVENT, refreshed)
  })
})
