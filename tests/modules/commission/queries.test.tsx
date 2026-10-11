import { afterEach, describe, expect, it } from 'vitest'
import { server } from '../../mocks/server'
import { useCommission, useCommissions, useProcessPayout } from '../../../src/modules/commission/queries'
import { expectIdle, runMutation, runQuery, stub } from '../queryHarness'

afterEach(() => server.resetHandlers())

describe('useCommissions', () => {
  it('posts the filters and returns the paginated envelope', async () => {
    const seen = stub('post', '/common/commissions', {
      status: true, data: [{ id: 1, borrower: 'Jo' }], meta: { total: 1 }, statistics: { total_deals: 1 },
    })
    const filters = { search: 'jo', page: 1, per_page: 10 }

    const { result } = await runQuery(() => useCommissions(filters as never))

    expect(seen.bodies[0]).toEqual(filters)
    expect((result.current.data as any).data).toHaveLength(1)
    expect((result.current.data as any).statistics.total_deals).toBe(1)
  })
})

describe('useCommission', () => {
  it('stays idle without an id', () => {
    expectIdle(() => useCommission(undefined))
  })

  it('fetches one commission and unwraps it', async () => {
    stub('get', '/common/commissions/12', { status: true, message: 'ok', data: { id: 12, borrower: 'Jo' } })

    const { result } = await runQuery(() => useCommission(12))

    expect(result.current.data).toEqual({ id: 12, borrower: 'Jo' })
  })
})

describe('useProcessPayout', () => {
  it('posts the payout and refreshes that commission and the list', async () => {
    const seen = stub('post', '/admin/commission/12/payout', { status: true, message: 'paid' })
    const payload = { payment_method: 'Cash', note: 'March payout' }

    const { invalidated } = await runMutation(() => useProcessPayout(), { id: 12, payload } as never)

    expect(seen.bodies[0]).toEqual(payload)
    expect(invalidated).toEqual([['commission', '12'], ['commissions']])
  })

  it('leaves the cache alone when the payout fails', async () => {
    stub('post', '/admin/commission/12/payout', { status: false, message: 'Already paid' }, 422)

    const { invalidated, error } = await runMutation(() => useProcessPayout(), { id: 12, payload: {} } as never)

    expect(error).toBeTruthy()
    expect(invalidated).toEqual([])
  })
})
