import { afterEach, describe, expect, it } from 'vitest'
import { server } from '../../mocks/server'
import { queryKeys } from '../../../src/lib/query/queryKeys'
import {
  usePartnerOptions,
  usePartner,
  useCreatePartner,
  useUpdatePartner,
  useDeletePartner,
  useSubscriptionStats,
} from '../../../src/modules/partner/queries'
import { expectIdle, runMutation, runQuery, stub } from '../queryHarness'

afterEach(() => server.resetHandlers())

const OPTIONS = [
  { id: 1, full_name: 'Mia Host', company_name: 'Host Co' },
  { id: 2, full_name: 'Wil Label', company_name: 'WLP Co' },
]

describe('partner queries', () => {
  it('usePartner does not fetch when disabled', () => {
    expectIdle(() => usePartner(1, false))
  })

  it('usePartner fetches one record under its own key', async () => {
    stub('get', '/admin/partners-details/2', { status: true, data: { id: 2, company_name: 'Acme' } })

    const { result, queryClient } = await runQuery(() => usePartner(2))

    expect(result.current.isSuccess).toBe(true)
    expect(queryClient.getQueryData(queryKeys.partner.detail(2))).toBeDefined()
  })
})

describe('usePartnerOptions', () => {
  it('can be switched off (non-host users never load the partner list)', () => {
    expectIdle(() => usePartnerOptions(false))
  })

  it('loads every partner, cached under the partner options key', async () => {
    const seen = stub('post', '/common/get-all-partners', { status: true, message: 'ok', data: OPTIONS })

    const { result, queryClient } = await runQuery(() => usePartnerOptions())

    expect(seen.calls).toBe(1)
    expect(result.current.data).toEqual(OPTIONS)
    expect(queryClient.getQueryData(queryKeys.partner.options())).toEqual(OPTIONS)
  })

  it('returns an empty list when the API reports failure', async () => {
    stub('post', '/common/get-all-partners', { status: false, message: 'no' })

    const { result } = await runQuery(() => usePartnerOptions())

    expect(result.current.data).toEqual([])
  })

  it('shares one request between the dropdowns using it', async () => {
    const seen = stub('post', '/common/get-all-partners', { status: true, message: 'ok', data: OPTIONS })
    const { queryClient } = await runQuery(() => usePartnerOptions())

    const { result } = await runQuery(() => usePartnerOptions(), queryClient)

    expect(result.current.data).toEqual(OPTIONS)
    expect(seen.calls).toBe(1)
  })
})

describe('partner mutations', () => {
  it('useCreatePartner sends the payload and refreshes the list', async () => {
    const seen = stub('post', '/admin/partners', { status: true, data: { id: 1 } })
    const payload = { full_name: 'Peter Partner', email: 'peter@x.com' }

    const { invalidated } = await runMutation(() => useCreatePartner(), payload as never)

    expect(seen.bodies[0]).toEqual(payload)
    expect(invalidated).toEqual([queryKeys.partner.list()])
  })

  it('useUpdatePartner sends the change and refreshes that record and the list', async () => {
    const seen = stub('put', '/admin/partners/2', { status: true, data: { id: 2 } })
    const payload = { company_name: 'Acme Renamed' }

    const { invalidated } = await runMutation(() => useUpdatePartner(), { id: 2, payload } as never)

    expect(seen.bodies[0]).toEqual(payload)
    expect(invalidated).toEqual([queryKeys.partner.detail(2), queryKeys.partner.list()])
  })

  it('useDeletePartner deletes and refreshes the list', async () => {
    const seen = stub('delete', '/admin/partners/2', { status: true, message: 'deleted' })

    const { invalidated } = await runMutation(() => useDeletePartner(), 2 as never)

    expect(seen.calls).toBe(1)
    expect(invalidated).toEqual([queryKeys.partner.list()])
  })

  it('a failed useCreatePartner leaves the cache alone', async () => {
    stub('post', '/admin/partners', { status: false, message: 'Invalid' }, 422)

    const { invalidated, error } = await runMutation(() => useCreatePartner(), {} as never)

    expect(error).toBeTruthy()
    expect(invalidated).toEqual([])
  })
})

describe('useSubscriptionStats', () => {
  it('asks for a single row, since only the statistics block is wanted', async () => {
    const seen = stub('post', '/common/subscriptions/fetch-all', { status: true, data: [], stats: { active: 3 } })

    const { result } = await runQuery(() => useSubscriptionStats())

    expect(seen.bodies[0]).toEqual({ per_page: 1 })
    expect(result.current.isSuccess).toBe(true)
  })
})
