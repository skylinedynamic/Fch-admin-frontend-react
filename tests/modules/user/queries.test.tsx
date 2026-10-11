import { afterEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { server } from '../../mocks/server'
import { createTestQueryClient } from '../../test-utils'
import { useDeleteUser } from '../../../src/modules/user/queries'

afterEach(() => server.resetHandlers())

describe('useDeleteUser', () => {
  it(
    'REGRESSION: previously called a nonexistent `deleteUser` export (services.ts only ever had ' +
      '`deleteUsers`, plural), so every single-user delete threw a TypeError at runtime — fixed to ' +
      'call deleteUsers([id]); this pins the id being wrapped in an array to the bulk-delete endpoint',
    async () => {
      let receivedBody: unknown = null
      server.use(
        http.post('*/common/users/multiple-delete', async ({ request }) => {
          receivedBody = await request.json()
          return HttpResponse.json({ status: true, message: 'Deleted' })
        })
      )

      const queryClient = createTestQueryClient()
      const { result } = renderHook(() => useDeleteUser(), {
        wrapper: ({ children }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>,
      })

      result.current.mutate(42)

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(receivedBody).toEqual({ ids: [42] })
    }
  )
})
