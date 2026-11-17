import { afterEach, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { server } from '../../mocks/server'
import { createTestQueryClient } from '../../test-utils'
import {
  useSavedAgreementTemplates,
  useSaveAgreementAsTemplate,
  useDeleteSavedAgreementTemplate,
  useUpdateSavedAgreementTemplate,
} from '../../../src/modules/agreement/queries'
import { queryKeys } from '../../../src/lib/query/queryKeys'
import { ConfigPartnerProvider } from '../../../src/modules/settings/configPartner'

afterEach(() => server.resetHandlers())

const wrap = (partnerId?: number) => {
  const queryClient = createTestQueryClient()
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {partnerId ? <ConfigPartnerProvider partner={{ id: partnerId } as never}>{children}</ConfigPartnerProvider> : children}
    </QueryClientProvider>
  )
  return { queryClient, wrapper }
}

describe('useSavedAgreementTemplates', () => {
  it('does not fetch until enabled', () => {
    const { wrapper } = wrap()
    const { result } = renderHook(() => useSavedAgreementTemplates('borrower', false), { wrapper })
    expect(result.current.fetchStatus).toBe('idle')
  })

  it("lists the agreement type's saved templates", async () => {
    server.use(http.get('*/common/agreement-templates/saved', () =>
      HttpResponse.json({ status: true, data: [{ id: 4, slug: 'borrower', name: 'Short form' }] })))
    const { wrapper } = wrap()

    const { result } = renderHook(() => useSavedAgreementTemplates('borrower'), { wrapper })

    await waitFor(() => expect(result.current.data).toEqual([{ id: 4, slug: 'borrower', name: 'Short form' }]))
  })

  it("lists another partner's inside its configuration", async () => {
    let partnerId: string | null = null
    server.use(http.get('*/common/agreement-templates/saved', ({ request }) => {
      partnerId = new URL(request.url).searchParams.get('partner_id')
      return HttpResponse.json({ status: true, data: [] })
    }))
    const { wrapper } = wrap(7)

    const { result } = renderHook(() => useSavedAgreementTemplates('borrower'), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(partnerId).toBe('7')
  })
})

describe('useSaveAgreementAsTemplate', () => {
  it("refreshes the agreement type's saved templates", async () => {
    server.use(http.post('*/common/agreement-templates/saved', () =>
      HttpResponse.json({ status: true, data: { id: 5, slug: 'partner', name: 'New' } })))
    const { queryClient, wrapper } = wrap()
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useSaveAgreementAsTemplate(), { wrapper })
    await act(() => result.current.mutateAsync({ slug: 'partner', name: 'New', template_json: '{}' }))

    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.agreement.savedTemplates('partner') })
  })
})

describe('useDeleteSavedAgreementTemplate', () => {
  it("refreshes the agreement type's saved templates", async () => {
    server.use(http.delete('*/common/agreement-templates/saved/5', () => HttpResponse.json({ status: true, data: null })))
    const { queryClient, wrapper } = wrap()
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useDeleteSavedAgreementTemplate(), { wrapper })
    await act(() => result.current.mutateAsync({ id: 5, slug: 'borrower' }))

    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.agreement.savedTemplates('borrower') })
  })
})

describe('useUpdateSavedAgreementTemplate', () => {
  it("refreshes the agreement type's saved templates", async () => {
    server.use(http.put('*/common/agreement-templates/saved/5', () => HttpResponse.json({ status: true, data: { id: 5, slug: 'borrower', name: 'New' } })))
    const { queryClient, wrapper } = wrap()
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useUpdateSavedAgreementTemplate(), { wrapper })
    await act(() => result.current.mutateAsync({ id: 5, slug: 'borrower', name: 'New' }))

    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.agreement.savedTemplates('borrower') })
  })
})
