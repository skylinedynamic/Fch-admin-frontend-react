import { afterEach, describe, expect, it } from 'vitest'
import { server } from '../../mocks/server'
import { queryKeys } from '../../../src/lib/query/queryKeys'
import {
  useBorrowers,
  useBorrower,
  useCreateBorrower,
  useUpdateBorrower,
  useDeleteBorrower,
} from '../../../src/modules/borrower/queries'
import { expectIdle, runMutation, runQuery, stub } from '../queryHarness'

afterEach(() => server.resetHandlers())

describe('borrower queries', () => {
  it('useBorrowers fetches the list', async () => {
    const seen = stub('get', '/borrowers', [{ id: 1, name: 'Jane' }])

    const { result, queryClient } = await runQuery(() => useBorrowers())

    expect(seen.calls).toBe(1)
    expect(result.current.isSuccess).toBe(true)
    expect(queryClient.getQueryData(queryKeys.borrower.list())).toBeDefined()
  })

  it('useBorrower does not fetch when disabled', () => {
    expectIdle(() => useBorrower(1, false))
  })

  it('useBorrower fetches one record under its own key', async () => {
    stub('get', '/borrowers/12', { id: 12, name: 'Jane' })

    const { result, queryClient } = await runQuery(() => useBorrower(12))

    expect(result.current.isSuccess).toBe(true)
    expect(queryClient.getQueryData(queryKeys.borrower.detail(12))).toBeDefined()
  })
})

describe('borrower mutations', () => {
  it('useCreateBorrower sends the payload and refreshes the list', async () => {
    const seen = stub('post', '/borrowers', { status: true, data: { id: 1 } })
    const payload = { name: 'Jane' }

    const { invalidated } = await runMutation(() => useCreateBorrower(), payload as never)

    expect(seen.bodies[0]).toEqual(payload)
    expect(invalidated).toEqual([queryKeys.borrower.list()])
  })

  it('useUpdateBorrower sends the change and refreshes that record and the list', async () => {
    const seen = stub('put', '/borrowers/12', { status: true, data: { id: 12 } })
    const payload = { name: 'Jane Doe' }

    const { invalidated } = await runMutation(() => useUpdateBorrower(), { id: 12, payload } as never)

    expect(seen.bodies[0]).toEqual(payload)
    expect(invalidated).toEqual([queryKeys.borrower.detail(12), queryKeys.borrower.list()])
  })

  it('useDeleteBorrower deletes and refreshes the list', async () => {
    const seen = stub('delete', '/borrowers/12', { status: true, message: 'deleted' })

    const { invalidated } = await runMutation(() => useDeleteBorrower(), 12 as never)

    expect(seen.calls).toBe(1)
    expect(invalidated).toEqual([queryKeys.borrower.list()])
  })

  it('a failed useCreateBorrower leaves the cache alone', async () => {
    stub('post', '/borrowers', { status: false, message: 'Invalid' }, 422)

    const { invalidated, error } = await runMutation(() => useCreateBorrower(), {} as never)

    expect(error).toBeTruthy()
    expect(invalidated).toEqual([])
  })
})
