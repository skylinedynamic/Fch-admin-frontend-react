import { afterEach, describe, expect, it } from 'vitest'
import { server } from '../../mocks/server'
import {
  useCreateLender,
  useDeleteLender,
  useLender,
  useLenders,
  useUpdateLender,
} from '../../../src/modules/lender/queries'
import { expectIdle, runMutation, runQuery, stub } from '../queryHarness'

afterEach(() => server.resetHandlers())

describe('useLenders', () => {
  it('passes the filters as query parameters', async () => {
    const seen = stub('get', '/admin/lenders', { status: true, data: [{ id: 1, name: 'First Capital' }], meta: { total: 1 } })

    const { result } = await runQuery(() => useLenders({ search: 'first', page: 2 } as never))

    const url = new URL(seen.urls[0])
    expect(url.searchParams.get('search')).toBe('first')
    expect(url.searchParams.get('page')).toBe('2')
    expect((result.current.data as any).data).toHaveLength(1)
  })
})

describe('useLender', () => {
  it('stays idle without an id', () => {
    expectIdle(() => useLender(undefined))
  })

  it('fetches a single lender', async () => {
    stub('get', '/admin/lenders/7', { status: true, data: { id: 7, name: 'Second Street' } })

    const { result } = await runQuery(() => useLender(7))

    expect((result.current.data as any).data.name).toBe('Second Street')
  })
})

describe('lender mutations', () => {
  it('useCreateLender posts the lender and refreshes the list', async () => {
    const seen = stub('post', '/admin/lenders', { status: true, data: { id: 3 } })
    const payload = { name: 'Third Bank', legal_name: 'Third Bank NA' }

    const { invalidated } = await runMutation(() => useCreateLender(), payload as never)

    expect(seen.bodies[0]).toEqual(payload)
    expect(invalidated).toEqual([['lenders']])
  })

  it('useUpdateLender puts to the lender and refreshes that lender and the list', async () => {
    const seen = stub('put', '/admin/lenders/7', { status: true })
    const payload = { name: 'Renamed' }

    const { invalidated } = await runMutation(() => useUpdateLender(), { id: 7, payload } as never)

    expect(seen.bodies[0]).toEqual(payload)
    // The detail key is invalidated with the id as a string - the form reads it from the URL.
    expect(invalidated).toEqual([['lender', '7'], ['lenders']])
  })

  it('useDeleteLender deletes the lender and refreshes the list', async () => {
    const seen = stub('delete', '/admin/lenders/7', { status: true })

    const { invalidated } = await runMutation(() => useDeleteLender(), 7 as never)

    expect(seen.calls).toBe(1)
    expect(invalidated).toEqual([['lenders']])
  })

  it('leaves the cache alone when the delete is refused', async () => {
    stub('delete', '/admin/lenders/7', { status: false, message: 'In use' }, 409)

    const { invalidated, error } = await runMutation(() => useDeleteLender(), 7 as never)

    expect(error).toBeTruthy()
    expect(invalidated).toEqual([])
  })
})
