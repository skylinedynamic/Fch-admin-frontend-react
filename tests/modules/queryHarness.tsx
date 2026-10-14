import type { ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { expect } from 'vitest'
import { server } from '../mocks/server'
import { createTestQueryClient } from '../test-utils'

/**
 * Shared plumbing for the module `queries.ts` hook tests: a query client per
 * test, a record of what a mutation invalidated, and one-line MSW stubs.
 */
export type TestClient = ReturnType<typeof createTestQueryClient>

export const wrapperFor = (queryClient: TestClient) =>
  ({ children }: { children: ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>

/** Records every query key passed to invalidateQueries, in order. */
export const trackInvalidations = (queryClient: TestClient) => {
  const invalidated: unknown[][] = []
  const original = queryClient.invalidateQueries.bind(queryClient)
  queryClient.invalidateQueries = ((opts: any) => {
    invalidated.push(opts?.queryKey)
    return original(opts)
  }) as typeof queryClient.invalidateQueries
  return invalidated
}

type Method = 'get' | 'post' | 'put' | 'patch' | 'delete'

export type Stub = { calls: number; bodies: unknown[]; urls: string[] }

/** Answers `method path` with `body` and records each request it received. */
export const stub = (method: Method, path: string, body: unknown = { status: true, message: 'ok', data: {} }, status = 200): Stub => {
  const seen: Stub = { calls: 0, bodies: [], urls: [] }
  server.use(
    http[method](`*${path}`, async ({ request }) => {
      seen.calls += 1
      seen.urls.push(request.url)
      if (method !== 'get' && method !== 'delete') {
        seen.bodies.push(await request.clone().json().catch(() => null))
      }
      return HttpResponse.json(body as never, { status })
    })
  )
  return seen
}

/** Renders a query hook and waits for it to succeed. */
export async function runQuery<T>(hook: () => { isSuccess: boolean; isError: boolean; data: T }, queryClient = createTestQueryClient()) {
  const { result } = renderHook(hook, { wrapper: wrapperFor(queryClient) })
  await waitFor(() => expect(result.current.isSuccess || result.current.isError).toBe(true))
  return { result, queryClient }
}

/** Renders a mutation hook, runs it, and returns what it invalidated. */
export async function runMutation<V>(
  hook: () => { mutateAsync: (variables: V) => Promise<unknown> },
  variables: V,
  queryClient = createTestQueryClient()
) {
  const invalidated = trackInvalidations(queryClient)
  const { result } = renderHook(hook, { wrapper: wrapperFor(queryClient) })
  let outcome: unknown
  let error: unknown
  try {
    outcome = await result.current.mutateAsync(variables)
  } catch (e) {
    error = e
  }
  return { invalidated, outcome, error, queryClient }
}

/** A disabled query never leaves the idle state and never calls the API. */
export function expectIdle(hook: () => { fetchStatus: string }) {
  const { result } = renderHook(hook, { wrapper: wrapperFor(createTestQueryClient()) })
  expect(result.current.fetchStatus).toBe('idle')
}
