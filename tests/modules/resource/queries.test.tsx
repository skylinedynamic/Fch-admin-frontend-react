import { afterEach, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { server } from '../../mocks/server'
import { createTestQueryClient } from '../../test-utils'
import { useCreateResource, useUpdateResource, useDeleteResource, resourceKeys } from '../../../src/modules/resource/queries'

afterEach(() => server.resetHandlers())

const wrapperFor = (queryClient: ReturnType<typeof createTestQueryClient>) =>
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }

describe('resource mutations invalidate resourceKeys.all on success', () => {
  it('useCreateResource invalidates the resources cache', async () => {
    server.use(http.post('*/admin/resources', () => HttpResponse.json({ data: { id: 1 } })))
    const queryClient = createTestQueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useCreateResource(), { wrapper: wrapperFor(queryClient) })

    result.current.mutate({ resource_type: 'legal_registration', title: 'T', status: true })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: resourceKeys.all })
  })

  it('useUpdateResource invalidates the resources cache', async () => {
    server.use(http.post('*/admin/resources/:id', () => HttpResponse.json({ data: { id: 1 } })))
    const queryClient = createTestQueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useUpdateResource(), { wrapper: wrapperFor(queryClient) })

    result.current.mutate({ id: 1, data: { resource_type: 'legal_registration', title: 'T', status: true } })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: resourceKeys.all })
  })

  it('useDeleteResource invalidates the resources cache', async () => {
    server.use(http.delete('*/admin/resources/:id', () => new HttpResponse(null, { status: 204 })))
    const queryClient = createTestQueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useDeleteResource(), { wrapper: wrapperFor(queryClient) })

    result.current.mutate(1)

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: resourceKeys.all })
  })
})
