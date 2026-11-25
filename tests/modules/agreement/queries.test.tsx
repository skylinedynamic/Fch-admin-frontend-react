import { afterEach, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { server } from '../../mocks/server'
import { createTestQueryClient } from '../../test-utils'
import { useAgreement, useAgreements, useSaveAgreement, useToggleAgreementStatus, useSetAgreementRequired, useAgreementRequirement } from '../../../src/modules/agreement/queries'
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

  // R3-BUG-077: a partner with no template yet answers 404 - asked once, not
  // retried as the app's default (retry: 1) does for a failure.
  const appDefaults = () => new QueryClient({ defaultOptions: { queries: { retry: 1, retryDelay: 0 } } })

  it('asks once when the template is not made yet (404)', async () => {
    let calls = 0
    server.use(
      http.post('*/common/agreement-templates/show', () => {
        calls++
        return HttpResponse.json({ status: false, message: 'Agreement template not found' }, { status: 404 })
      })
    )
    const { wrapper } = wrap(appDefaults())
    const { result } = renderHook(() => useAgreement('borrower'), { wrapper })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(calls).toBe(1)
  })

  it('still retries a real failure', async () => {
    let calls = 0
    server.use(
      http.post('*/common/agreement-templates/show', () => {
        calls++
        return HttpResponse.json({ status: false, message: 'Server Error' }, { status: 500 })
      })
    )
    const { wrapper } = wrap(appDefaults())
    const { result } = renderHook(() => useAgreement('borrower'), { wrapper })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(calls).toBe(2)
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

describe('useSetAgreementRequired', () => {
  it('posts the change and resolves with the new state', async () => {
    server.use(
      http.post('*/common/agreement-sign/required/9', () =>
        HttpResponse.json({ status: true, message: 'Updated', data: { user_id: 9, agreement_required: true } })
      )
    )
    const { wrapper } = wrap()
    const { result } = renderHook(() => useSetAgreementRequired(), { wrapper })

    const res = await result.current.mutateAsync({ userId: 9, required: true })

    expect(res.data).toEqual({ user_id: 9, agreement_required: true })
  })
})

describe('useAgreementRequirement', () => {
  const status = { user_id: 9, agreement_required: true, signing_enabled: true, template_active: true, can_change: true, locked_reason: null }

  it('does not fetch without a login to ask about', () => {
    const { wrapper } = wrap()
    const { result } = renderHook(() => useAgreementRequirement(null), { wrapper })
    expect(result.current.fetchStatus).toBe('idle')
  })

  it("fetches the user's requirement under its own key", async () => {
    server.use(http.get('*/common/agreement-sign/required/9', () => HttpResponse.json({ status: true, message: 'ok', data: status })))
    const { wrapper, queryClient } = wrap()
    const { result } = renderHook(() => useAgreementRequirement(9), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.data).toEqual(status)
    expect(queryClient.getQueryData(queryKeys.agreement.requirement(9))).toBeDefined()
  })

  it('takes the saved value from a change, without fetching again', async () => {
    server.use(
      http.post('*/common/agreement-sign/required/9', () =>
        HttpResponse.json({ status: true, message: 'Updated', data: { user_id: 9, agreement_required: false } })
      )
    )
    const { wrapper, queryClient } = wrap()
    queryClient.setQueryData(queryKeys.agreement.requirement(9), { status: true, message: 'ok', data: status })
    const { result } = renderHook(() => useSetAgreementRequired(), { wrapper })

    await result.current.mutateAsync({ userId: 9, required: false })

    expect(queryClient.getQueryData<{ data: typeof status }>(queryKeys.agreement.requirement(9))?.data).toEqual({
      ...status,
      agreement_required: false,
    })
  })
})
