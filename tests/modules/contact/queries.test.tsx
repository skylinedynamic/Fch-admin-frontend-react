import { afterEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { server } from '../../mocks/server'
import { createTestQueryClient } from '../../test-utils'
import {
  useContacts,
  useContact,
  useCreateContact,
  useUpdateContact,
  useDeleteContact,
} from '../../../src/modules/contact/queries'
import { queryKeys } from '../../../src/lib/query/queryKeys'

afterEach(() => server.resetHandlers())

const wrapperFor = (queryClient: ReturnType<typeof createTestQueryClient>) =>
  ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )

const trackInvalidations = (queryClient: ReturnType<typeof createTestQueryClient>) => {
  const invalidated: unknown[][] = []
  const original = queryClient.invalidateQueries.bind(queryClient)
  queryClient.invalidateQueries = (opts: any) => {
    invalidated.push(opts.queryKey)
    return original(opts)
  }
  return invalidated
}

describe('useContacts', () => {
  it('fetches the contact list', async () => {
    server.use(
      http.post('*/common/contacts/fetch-contacts', () =>
        HttpResponse.json({ status: true, message: 'ok', data: [] })
      )
    )
    const queryClient = createTestQueryClient()
    const { result } = renderHook(() => useContacts({ search: 'x' }), { wrapper: wrapperFor(queryClient) })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })
})

describe('useContact', () => {
  it('is disabled when enabled=false is passed', () => {
    const queryClient = createTestQueryClient()
    const { result } = renderHook(() => useContact(1, false), { wrapper: wrapperFor(queryClient) })
    expect(result.current.fetchStatus).toBe('idle')
  })

  it('fetches and returns the unwrapped contact', async () => {
    server.use(
      http.get('*/common/contacts/4', () =>
        HttpResponse.json({ status: true, message: 'ok', data: { id: 4, full_name: 'X', first_name: 'X', last_name: '', mobile_number: '1', email: 'x@x.com' } })
      )
    )
    const queryClient = createTestQueryClient()
    const { result } = renderHook(() => useContact(4), { wrapper: wrapperFor(queryClient) })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.full_name).toBe('X')
  })
})

describe('useCreateContact', () => {
  it('invalidates the contact list cache on success', async () => {
    server.use(
      http.post('*/common/contacts', () =>
        HttpResponse.json({ status: true, message: 'created', data: { id: 1, full_name: 'N', first_name: 'N', last_name: '', mobile_number: '1', email: 'n@x.com' } })
      )
    )
    const queryClient = createTestQueryClient()
    const invalidated = trackInvalidations(queryClient)
    const { result } = renderHook(() => useCreateContact(), { wrapper: wrapperFor(queryClient) })

    result.current.mutate({ full_name: 'N', first_name: 'N', last_name: '', mobile_number: '1', email: 'n@x.com' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(invalidated).toContainEqual(queryKeys.contact.list())
  })
})

describe('useUpdateContact', () => {
  it('invalidates both the detail cache for that id and the list cache on success', async () => {
    server.use(
      http.put('*/common/contacts/6', () =>
        HttpResponse.json({ status: true, message: 'updated', data: { id: 6, full_name: 'U', first_name: 'U', last_name: '', mobile_number: '1', email: 'u@x.com' } })
      )
    )
    const queryClient = createTestQueryClient()
    const invalidated = trackInvalidations(queryClient)
    const { result } = renderHook(() => useUpdateContact(), { wrapper: wrapperFor(queryClient) })

    result.current.mutate({ id: 6, payload: { full_name: 'U' } })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(invalidated).toContainEqual(queryKeys.contact.detail(6))
    expect(invalidated).toContainEqual(queryKeys.contact.list())
  })
})

describe('useDeleteContact', () => {
  it('invalidates the contact list cache on success', async () => {
    server.use(http.delete('*/common/contacts/7', () => HttpResponse.json({ status: true, message: 'deleted' })))
    const queryClient = createTestQueryClient()
    const invalidated = trackInvalidations(queryClient)
    const { result } = renderHook(() => useDeleteContact(), { wrapper: wrapperFor(queryClient) })

    result.current.mutate(7)

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(invalidated).toContainEqual(queryKeys.contact.list())
  })
})
