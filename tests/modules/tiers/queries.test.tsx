import { afterEach, describe, expect, it } from 'vitest'
import { server } from '../../mocks/server'
import {
  useCreateTier,
  useCreateTierVendor,
  useDeleteTier,
  useDeleteTierVendor,
  useDeleteTierVendors,
  useTier,
  useTierRelatedApis,
  useTiers,
  useTierVendors,
  useUpdateTier,
  useUpdateTierVendor,
} from '../../../src/modules/tiers/queries'
import { expectIdle, runMutation, runQuery, stub } from '../queryHarness'

afterEach(() => server.resetHandlers())

const BASE = '/admin/credit-builder'

describe('tier queries', () => {
  it('useTiers posts the filters', async () => {
    const seen = stub('post', `${BASE}/tiers/fetch-tiers`, { status: true, data: [{ id: 1, name: 'Tier 0' }] })

    const { result } = await runQuery(() => useTiers({ search: 'tier' }))

    expect(seen.bodies[0]).toEqual({ search: 'tier' })
    expect((result.current.data as any).data).toHaveLength(1)
  })

  it('useTiers sends an empty body when no filters are given', async () => {
    const seen = stub('post', `${BASE}/tiers/fetch-tiers`, { status: true, data: [] })

    await runQuery(() => useTiers())

    expect(seen.bodies[0]).toEqual({})
  })

  it('useTier stays idle without an id', () => {
    expectIdle(() => useTier(0))
    expectIdle(() => useTier(''))
  })

  it('useTier fetches one tier', async () => {
    stub('get', `${BASE}/tiers/2`, { status: true, data: { id: 2, name: 'Tier 1', code: 'T1' } })

    const { result } = await runQuery(() => useTier(2))

    expect((result.current.data as any).data.code).toBe('T1')
  })

  it('useTierRelatedApis stays idle without a tier', () => {
    expectIdle(() => useTierRelatedApis(null))
  })

  it('useTierRelatedApis unwraps the list', async () => {
    stub('get', `${BASE}/tier-related-api/2`, { status: true, data: [{ id: 1, name: 'MicroBilt' }] })

    const { result } = await runQuery(() => useTierRelatedApis(2))

    expect(result.current.data).toEqual([{ id: 1, name: 'MicroBilt' }])
  })

  it('useTierRelatedApis falls back to an empty list', async () => {
    stub('get', `${BASE}/tier-related-api/2`, { status: true })

    const { result } = await runQuery(() => useTierRelatedApis(2))

    expect(result.current.data).toEqual([])
  })
})

describe('tier mutations', () => {
  const tier = { name: 'Tier 9', title: 'Advanced', subtitle: '', description: '', status: 'Active' }

  it('useCreateTier posts the tier and refreshes the list', async () => {
    const seen = stub('post', `${BASE}/tiers`, { status: true, data: { id: 9 } })

    const { invalidated } = await runMutation(() => useCreateTier(), tier as never)

    expect(seen.bodies[0]).toEqual(tier)
    expect(invalidated).toEqual([['tiers']])
  })

  it('useUpdateTier puts to the tier and refreshes the list and every tier detail', async () => {
    const seen = stub('put', `${BASE}/tiers/9`, { status: true })

    const { invalidated } = await runMutation(() => useUpdateTier(), { id: 9, data: tier } as never)

    expect(seen.bodies[0]).toEqual(tier)
    expect(invalidated).toEqual([['tiers'], ['tier']])
  })

  it('useDeleteTier deletes and refreshes the list', async () => {
    const seen = stub('delete', `${BASE}/tiers/9`, { status: true })

    const { invalidated } = await runMutation(() => useDeleteTier(), 9 as never)

    expect(seen.calls).toBe(1)
    expect(invalidated).toEqual([['tiers']])
  })

  it('a failed create leaves the cache alone', async () => {
    stub('post', `${BASE}/tiers`, { status: false, message: 'Invalid', errors: { name: 'required' } }, 422)

    const { invalidated, error } = await runMutation(() => useCreateTier(), {} as never)

    expect(error).toBeTruthy()
    expect(invalidated).toEqual([])
  })
})

describe('tier vendor hooks', () => {
  const vendor = { name: 'Uline', tier_id: 2 }

  it('useTierVendors posts the filters', async () => {
    const seen = stub('post', `${BASE}/vendors/fetch-vendors`, { status: true, data: [{ id: 1, name: 'Uline' }] })

    const { result } = await runQuery(() => useTierVendors({ tier_id: 2 }))

    expect(seen.bodies[0]).toEqual({ tier_id: 2 })
    expect((result.current.data as any).data[0].name).toBe('Uline')
  })

  it('useCreateTierVendor posts JSON and refreshes the vendor list', async () => {
    const seen = stub('post', `${BASE}/vendors`, { status: true, data: { id: 1 } })

    const { invalidated } = await runMutation(() => useCreateTierVendor(), vendor as never)

    expect(seen.bodies[0]).toEqual(vendor)
    expect(invalidated).toEqual([['tier-vendors']])
  })

  it('useUpdateTierVendor uses PUT for a plain payload', async () => {
    const put = stub('put', `${BASE}/vendors/4`, { status: true })

    const { invalidated } = await runMutation(() => useUpdateTierVendor(), { id: 4, data: vendor } as never)

    expect(put.calls).toBe(1)
    expect(invalidated).toEqual([['tier-vendors']])
  })

  it('useUpdateTierVendor switches to POST when a file is attached (multipart)', async () => {
    const post = stub('post', `${BASE}/vendors/4`, { status: true })
    const put = stub('put', `${BASE}/vendors/4`, { status: true })
    const form = new FormData()
    form.append('name', 'Uline')

    await runMutation(() => useUpdateTierVendor(), { id: 4, data: form } as never)

    expect(post.calls).toBe(1)
    expect(put.calls).toBe(0)
  })

  it('useDeleteTierVendor deletes one vendor', async () => {
    const seen = stub('delete', `${BASE}/vendors/4`, { status: true })

    const { invalidated } = await runMutation(() => useDeleteTierVendor(), 4 as never)

    expect(seen.calls).toBe(1)
    expect(invalidated).toEqual([['tier-vendors']])
  })

  it('useDeleteTierVendors posts the ids in bulk', async () => {
    const seen = stub('post', `${BASE}/vendors-multiple-delete`, { status: true })

    const { invalidated } = await runMutation(() => useDeleteTierVendors(), [4, 5] as never)

    expect(seen.bodies[0]).toEqual({ ids: [4, 5] })
    expect(invalidated).toEqual([['tier-vendors']])
  })
})
