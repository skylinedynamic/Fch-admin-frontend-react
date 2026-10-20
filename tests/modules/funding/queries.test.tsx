import { afterEach, describe, expect, it } from 'vitest'
import { server } from '../../mocks/server'
import {
  useCreateFundingSequencing,
  useDeleteFundingSequencing,
  useFundingSequencing,
  useFundingSequencings,
  useUpdateFundingSequencing,
  useUpdateFundingSequencingStatus,
} from '../../../src/modules/funding/queries'
import { expectIdle, runMutation, runQuery, stub } from '../queryHarness'

afterEach(() => server.resetHandlers())

const ADMIN = '/admin/funding-sequencings'

describe('funding sequencing queries', () => {
  it('useFundingSequencings posts the filters', async () => {
    const seen = stub('post', '/common/funding-sequencings/fetch', { status: true, data: [{ id: 1, name: 'SBA 7(a)' }] })

    const { result } = await runQuery(() => useFundingSequencings({ search: 'sba' } as never))

    expect(seen.bodies[0]).toEqual({ search: 'sba' })
    expect((result.current.data as any).data[0].name).toBe('SBA 7(a)')
  })

  it('useFundingSequencing stays idle without an id', () => {
    expectIdle(() => useFundingSequencing(undefined))
  })

  it('useFundingSequencing fetches one sequence', async () => {
    stub('get', `${ADMIN}/4`, { status: true, data: { id: 4, name: 'Term Loan' } })

    const { result } = await runQuery(() => useFundingSequencing(4))

    expect((result.current.data as any).data.name).toBe('Term Loan')
  })
})

describe('funding sequencing mutations', () => {
  const payload = { name: 'Equipment Financing', min_amount: 10000 }

  it('useCreateFundingSequencing posts the sequence and refreshes the list', async () => {
    const seen = stub('post', ADMIN, { status: true, data: { id: 9 } })

    const { invalidated } = await runMutation(() => useCreateFundingSequencing(), payload as never)

    expect(seen.bodies[0]).toEqual(payload)
    expect(invalidated).toEqual([['funding_sequencings']])
  })

  it('useUpdateFundingSequencing puts the change and refreshes that sequence and the list', async () => {
    const seen = stub('put', `${ADMIN}/4`, { status: true })

    const { invalidated } = await runMutation(() => useUpdateFundingSequencing(), { id: 4, payload } as never)

    expect(seen.bodies[0]).toEqual(payload)
    expect(invalidated).toEqual([['funding_sequencing', '4'], ['funding_sequencings']])
  })

  it('useDeleteFundingSequencing deletes and refreshes the list', async () => {
    const seen = stub('delete', `${ADMIN}/4`, { status: true })

    const { invalidated } = await runMutation(() => useDeleteFundingSequencing(), 4 as never)

    expect(seen.calls).toBe(1)
    expect(invalidated).toEqual([['funding_sequencings']])
  })

  it('useUpdateFundingSequencingStatus patches only the status', async () => {
    const seen = stub('patch', `${ADMIN}/4/status`, { status: true })

    const { invalidated } = await runMutation(() => useUpdateFundingSequencingStatus(), { id: 4, status: 'Inactive' } as never)

    expect(seen.bodies[0]).toEqual({ status: 'Inactive' })
    expect(invalidated).toEqual([['funding_sequencing', '4'], ['funding_sequencings']])
  })

  it('a refused delete leaves the cache alone', async () => {
    stub('delete', `${ADMIN}/4`, { status: false, message: 'In use' }, 409)

    const { invalidated, error } = await runMutation(() => useDeleteFundingSequencing(), 4 as never)

    expect(error).toBeTruthy()
    expect(invalidated).toEqual([])
  })
})
