import { afterEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { server } from '../../mocks/server'
import { createTestQueryClient } from '../../test-utils'
import { useDocumentTypes, useBorrowerDocuments, useDeleteDocument } from '../../../src/modules/documents/queries'
import { queryKeys } from '../../../src/lib/query/queryKeys'

afterEach(() => server.resetHandlers())

describe('useDocumentTypes', () => {
  it('fetches and returns the document type list', async () => {
    server.use(
      http.get('*/common/doc-types', () =>
        HttpResponse.json({ status: true, message: 'ok', data: [{ id: 1, name: 'W2', sort_order: 1 }] })
      )
    )

    const queryClient = createTestQueryClient()
    const { result } = renderHook(() => useDocumentTypes(), {
      wrapper: ({ children }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>,
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([{ id: 1, name: 'W2', sort_order: 1 }])
  })
})

describe('useBorrowerDocuments', () => {
  it('fetches and returns the documents keyed by type id', async () => {
    server.use(
      http.get('*/borrower/documents', () => HttpResponse.json({ status: true, message: 'ok', data: { '1': [] } }))
    )

    const queryClient = createTestQueryClient()
    const { result } = renderHook(() => useBorrowerDocuments(), {
      wrapper: ({ children }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>,
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual({ '1': [] })
  })
})

describe('useDeleteDocument', () => {
  it('invalidates the documents list cache on success', async () => {
    server.use(
      http.delete('*/borrower/documents/9', () =>
        HttpResponse.json({ status: true, message: 'deleted', data: null })
      )
    )

    const queryClient = createTestQueryClient()
    const invalidated: unknown[][] = []
    const originalInvalidate = queryClient.invalidateQueries.bind(queryClient)
    queryClient.invalidateQueries = (opts: any) => {
      invalidated.push(opts.queryKey)
      return originalInvalidate(opts)
    }

    const { result } = renderHook(() => useDeleteDocument(), {
      wrapper: ({ children }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>,
    })

    result.current.mutate(9)

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(invalidated).toContainEqual(queryKeys.documents.list())
  })
})
