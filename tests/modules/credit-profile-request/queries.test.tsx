import { afterEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { server } from '../../mocks/server'
import { createTestQueryClient } from '../../test-utils'
import { useCreditProfileRequests, useCreditProfileRequestDetails } from '../../../src/modules/credit-profile-request/queries'

afterEach(() => server.resetHandlers())

describe('useCreditProfileRequests', () => {
  it('fetches with the given params and returns the paginated list', async () => {
    server.use(
      http.post('*/admin/credit-profile-requests', () =>
        HttpResponse.json({
          status: true,
          message: 'ok',
          data: {
            current_page: 1,
            data: [{ id: 1, first_name: 'Jane', last_name: 'Doe', ssn: '123-45-6789' }],
            first_page_url: null,
            from: 1,
            last_page: 1,
            last_page_url: null,
            links: [],
            next_page_url: null,
            path: 'url',
            per_page: 15,
            prev_page_url: null,
            to: 1,
            total: 1,
          },
        })
      )
    )

    const queryClient = createTestQueryClient()
    const { result } = renderHook(() => useCreditProfileRequests({ search: 'jane' }), {
      wrapper: ({ children }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>,
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.data.data[0].first_name).toBe('Jane')
  })
})

describe('useCreditProfileRequestDetails', () => {
  it('does not fetch when enabled=false', () => {
    const queryClient = createTestQueryClient()
    const { result } = renderHook(() => useCreditProfileRequestDetails(1, false), {
      wrapper: ({ children }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>,
    })

    expect(result.current.fetchStatus).toBe('idle')
  })

  it('does not fetch when id is falsy, even with enabled=true', () => {
    const queryClient = createTestQueryClient()
    const { result } = renderHook(() => useCreditProfileRequestDetails(0, true), {
      wrapper: ({ children }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>,
    })

    expect(result.current.fetchStatus).toBe('idle')
  })

  it('fetches the detail once id is provided and enabled defaults to true', async () => {
    server.use(
      http.get('*/admin/credit-profile-requests/7', () =>
        HttpResponse.json({
          status: true,
          message: 'ok',
          data: { id: 7, first_name: 'Jane', last_name: 'Doe', ssn: '987-65-4321' },
        })
      )
    )

    const queryClient = createTestQueryClient()
    const { result } = renderHook(() => useCreditProfileRequestDetails(7), {
      wrapper: ({ children }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>,
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.data.ssn).toBe('987-65-4321')
  })
})
