import { afterEach, describe, expect, it } from 'vitest'
import { server } from '../../mocks/server'
import {
  clientKeys,
  useAllUsers,
  useArchiveClients,
  useBorrowerPlans,
  useBorrowerProgress,
  useBorrowerTiers,
  useBorrowerTierWiseTaskList,
  useBusinessFinancials,
  useClient,
  useClientCapitalAccessOverview,
  useClientCapitalAccessStrategies,
  useClientChecklist,
  useClientCreditProfile,
  useClientProfileStats,
  useClients,
  useCreateClient,
  useDeleteClient,
  useDeleteClients,
  usePartners,
  useSaveClientChecklist,
  useUnarchiveClients,
  useUpdateBusinessFinancials,
  useUpdateClient,
  useUpdateTaskVerificationStatus,
} from '../../../src/modules/client/queries'
import { expectIdle, runMutation, runQuery, stub } from '../queryHarness'

afterEach(() => server.resetHandlers())

const B = '/common/borrowers'

describe('clientKeys', () => {
  it('nests every per-client key under that client detail key, so one invalidation clears them all', () => {
    const detail = clientKeys.detail(7)
    for (const key of [
      clientKeys.checklist(7), clientKeys.stats(7), clientKeys.creditProfile(7), clientKeys.capitalAccess(7),
      clientKeys.capitalAccessStrategies(7), clientKeys.businessFinancials(7), clientKeys.tierTasks(7), clientKeys.progress(7),
    ]) {
      expect(key.slice(0, detail.length)).toEqual([...detail])
    }
  })

  it('keeps list keys apart from detail keys', () => {
    expect(clientKeys.list({ search: 'a' } as never).slice(0, 2)).toEqual(['clients', 'list'])
    expect(clientKeys.detail(7).slice(0, 2)).toEqual(['clients', 'detail'])
  })
})

describe('client list and detail queries', () => {
  it('useClients posts the filters to the borrower list endpoint', async () => {
    const seen = stub('post', `${B}/fetch-all-borrowers`, { status: true, data: [{ id: 1 }], meta: { total: 1 }, statistics: { total: 1 } })
    const params = { search: 'smith', page: 1 }

    const { result, queryClient } = await runQuery(() => useClients(params as never))

    expect(seen.bodies[0]).toEqual(params)
    expect((result.current.data as any).statistics.total).toBe(1)
    expect(queryClient.getQueryData(clientKeys.list(params as never))).toBeDefined()
  })

  it('useClient stays idle without an id or when disabled', () => {
    expectIdle(() => useClient(''))
    expectIdle(() => useClient(7, false))
  })

  it('useClient fetches the client', async () => {
    stub('get', `${B}/7`, { status: true, data: { id: 7, first_name: 'Jo' } })

    const { result } = await runQuery(() => useClient(7))

    expect((result.current.data as any).data.first_name).toBe('Jo')
  })
})

describe.each([
  { name: 'useBusinessFinancials', hook: useBusinessFinancials, method: 'get' as const, path: `${B}/business-financials/7`, key: clientKeys.businessFinancials(7) },
  { name: 'useClientChecklist', hook: useClientChecklist, method: 'get' as const, path: '/common/borrower-documents-checklist/7', key: clientKeys.checklist(7) },
  { name: 'useClientProfileStats', hook: useClientProfileStats, method: 'post' as const, path: '/common/borrowers-profile-states-details-count/7', key: clientKeys.stats(7) },
  { name: 'useClientCreditProfile', hook: useClientCreditProfile, method: 'get' as const, path: `${B}/get-credit-profile/7`, key: clientKeys.creditProfile(7) },
  { name: 'useClientCapitalAccessOverview', hook: useClientCapitalAccessOverview, method: 'get' as const, path: `${B}/7/capital-access-overview`, key: clientKeys.capitalAccess(7) },
  { name: 'useClientCapitalAccessStrategies', hook: useClientCapitalAccessStrategies, method: 'get' as const, path: `${B}/7/capital-access-strategies`, key: clientKeys.capitalAccessStrategies(7) },
])('$name', ({ hook, method, path, key }) => {
  it('loads for the client and caches under its own key', async () => {
    const seen = stub(method, path, { status: true, data: { ok: true } })

    const { queryClient } = await runQuery(() => hook(7))

    expect(seen.calls).toBe(1)
    expect(queryClient.getQueryData(key)).toBeDefined()
  })

  it('stays idle without an id or when disabled', () => {
    expectIdle(() => hook(''))
    expectIdle(() => hook(7, false))
  })
})

describe('client mutations', () => {
  it('useCreateClient posts the client and refreshes the lists', async () => {
    const seen = stub('post', B, { status: true, data: { id: 9 } })
    const payload = { first_name: 'New', last_name: 'Client' }

    const { invalidated } = await runMutation(() => useCreateClient(), payload as never)

    expect(seen.bodies[0]).toEqual(payload)
    expect(invalidated).toEqual([clientKeys.lists()])
  })

  it('useUpdateClient posts to the client and refreshes it and the lists', async () => {
    const seen = stub('post', `${B}/7`, { status: true, data: { id: 7 } })

    const { invalidated } = await runMutation(() => useUpdateClient(), { id: 7, data: { first_name: 'Jon' } } as never)

    expect(seen.bodies[0]).toEqual({ first_name: 'Jon' })
    expect(invalidated).toEqual([clientKeys.detail(7), clientKeys.lists()])
  })

  it('useUpdateBusinessFinancials refreshes the financials and the lists', async () => {
    const seen = stub('post', `${B}/7/business-financials`, { status: true })

    const { invalidated } = await runMutation(() => useUpdateBusinessFinancials(), { id: 7, data: { monthly_revenue: 5000 } } as never)

    expect(seen.bodies[0]).toEqual({ monthly_revenue: 5000 })
    expect(invalidated).toEqual([clientKeys.businessFinancials(7), clientKeys.lists()])
  })

  it('useDeleteClient deletes one client', async () => {
    const seen = stub('delete', `${B}/7`, { status: true })

    const { invalidated } = await runMutation(() => useDeleteClient(), 7 as never)

    expect(seen.calls).toBe(1)
    expect(invalidated).toEqual([clientKeys.lists()])
  })

  it.each([
    { name: 'useDeleteClients', hook: useDeleteClients, path: '/common/borrowers-multiple-delete' },
    { name: 'useArchiveClients', hook: useArchiveClients, path: `${B}/archive` },
    { name: 'useUnarchiveClients', hook: useUnarchiveClients, path: `${B}/unarchive` },
  ])('$name posts the ids in bulk and refreshes the lists', async ({ hook, path }) => {
    const seen = stub('post', path, { status: true, message: 'done' })

    const { invalidated } = await runMutation(() => hook(), [7, 8] as never)

    expect(seen.bodies[0]).toEqual({ ids: [7, 8] })
    expect(invalidated).toEqual([clientKeys.lists()])
  })

  it('useSaveClientChecklist posts the ticked document types and refreshes the checklist', async () => {
    const seen = stub('post', '/common/borrower-documents-checklist/save/7', { status: true })

    const { invalidated } = await runMutation(() => useSaveClientChecklist(), { id: 7, checkedIds: [1, 3] })

    expect(seen.bodies[0]).toEqual({ checked_doc_type_ids: [1, 3] })
    expect(invalidated).toEqual([clientKeys.checklist(7)])
  })

  it('a refused delete leaves the cache alone', async () => {
    stub('post', '/common/borrowers-multiple-delete', { status: false, message: 'Has active funding' }, 409)

    const { invalidated, error } = await runMutation(() => useDeleteClients(), [7] as never)

    expect(error).toBeTruthy()
    expect(invalidated).toEqual([])
  })
})

describe('dropdown source hooks', () => {
  it('usePartners maps partners to id / names / display label', async () => {
    stub('post', '/admin/partners/fetch-partners', { status: true, data: [{ id: 2, full_name: 'John Partner', company_name: 'Tech Solutions', email: 'x' }] })

    const { result } = await runQuery(() => usePartners())

    expect(result.current.data).toEqual([
      { id: 2, full_name: 'John Partner', company_name: 'Tech Solutions', displayLabel: 'John Partner (Tech Solutions)' },
    ])
  })

  it('usePartners returns an empty list when the API reports failure', async () => {
    stub('post', '/admin/partners/fetch-partners', { status: false, message: 'no' })

    const { result } = await runQuery(() => usePartners())

    expect(result.current.data).toEqual([])
  })

  it('usePartners can be switched off (non-host users never load the partner list)', () => {
    expectIdle(() => usePartners(false))
  })

  it('useAllUsers maps users to id / name / label', async () => {
    stub('post', '/common/get-all-users', { status: true, data: [{ id: 5, name: 'Sam Sales', email: 'x' }] })

    const { result } = await runQuery(() => useAllUsers())

    expect(result.current.data).toEqual([{ id: 5, full_name: 'Sam Sales', displayLabel: 'Sam Sales' }])
  })

  it('useBorrowerTiers maps tiers to label/value pairs keyed by name', async () => {
    stub('post', '/common/tiers/fetch-all-tiers', { status: true, data: [{ id: 1, name: 'Tier 0' }, { id: 2, name: 'Tier 1' }] })

    const { result } = await runQuery(() => useBorrowerTiers())

    expect(result.current.data).toEqual([{ label: 'Tier 0', value: 'Tier 0' }, { label: 'Tier 1', value: 'Tier 1' }])
  })

  it('useBorrowerPlans returns the plan list, or an empty list on failure', async () => {
    stub('get', '/common/borrower-plans', { status: true, data: [{ id: 1, name: 'Starter' }] })
    const ok = await runQuery(() => useBorrowerPlans())
    expect(ok.result.current.data).toEqual([{ id: 1, name: 'Starter' }])

    server.resetHandlers()
    stub('get', '/common/borrower-plans', { status: false })
    const failed = await runQuery(() => useBorrowerPlans())
    expect(failed.result.current.data).toEqual([])
  })

  it('useBorrowerPlans can be switched off', () => {
    expectIdle(() => useBorrowerPlans(false))
  })
})

describe('credit builder progress hooks', () => {
  const CB = '/admin/credit-builder'

  it('useBorrowerTierWiseTaskList posts the borrower id and unwraps the tiers', async () => {
    const seen = stub('post', `${CB}/tiers/borrowers/tier-wise-tasklist`, { status: true, data: [{ id: 1, name: 'Tier 0', tasks: [] }] })

    const { result } = await runQuery(() => useBorrowerTierWiseTaskList(7))

    expect(seen.bodies[0]).toEqual({ borrower_id: 7 })
    expect(result.current.data).toEqual([{ id: 1, name: 'Tier 0', tasks: [] }])
  })

  it('useBorrowerTierWiseTaskList falls back to an empty list', async () => {
    stub('post', `${CB}/tiers/borrowers/tier-wise-tasklist`, { status: false })

    const { result } = await runQuery(() => useBorrowerTierWiseTaskList(7))

    expect(result.current.data).toEqual([])
  })

  it('useBorrowerProgress posts the borrower id and falls back to an empty object', async () => {
    const seen = stub('post', `${CB}/tiers/borrowers/progress`, { status: false })

    const { result } = await runQuery(() => useBorrowerProgress(7))

    expect(seen.bodies[0]).toEqual({ borrower_id: 7 })
    expect(result.current.data).toEqual({})
  })

  it('both stay idle without a borrower', () => {
    expectIdle(() => useBorrowerTierWiseTaskList(''))
    expectIdle(() => useBorrowerProgress(''))
    expectIdle(() => useBorrowerProgress(7, false))
  })

  it('useUpdateTaskVerificationStatus refreshes that borrower tasks and progress', async () => {
    const seen = stub('post', `${CB}/tasks/update-status`, { status: true })
    const payload = { tasks: [1, 2], borrower_id: 7, tier_id: 2, status: 'verified' }

    const { invalidated } = await runMutation(() => useUpdateTaskVerificationStatus(), payload as never)

    expect(seen.bodies[0]).toEqual(payload)
    expect(invalidated).toEqual([clientKeys.tierTasks(7), clientKeys.progress(7)])
  })

  it('useUpdateTaskVerificationStatus refreshes nothing when no borrower is given', async () => {
    stub('post', `${CB}/tasks/update-status`, { status: true })

    const { invalidated } = await runMutation(() => useUpdateTaskVerificationStatus(), { tasks: [1], status: 'verified' } as never)

    expect(invalidated).toEqual([])
  })
})
