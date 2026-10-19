import { afterEach, describe, expect, it } from 'vitest'
import { server } from '../../mocks/server'
import { queryKeys } from '../../../src/lib/query/queryKeys'
import {
  useAssignLenderToFundingRequest,
  useFundingApplicationAuditHistory,
  useFundingApplicationDetails,
  useFundingApplications,
  useFundingApplicationStats,
  useFundingRequestDetails,
  useFundingRequests,
  usePreQualificationApplicationDetails,
  usePreQualificationApplications,
  usePreQualificationStats,
  useRunAiPreQualification,
  useSaveFundingApplicationCommission,
  useUpdateApplicationStatus,
  useUpdateFundingApplicationStatus,
  useUpdateFundingRequestStatus,
} from '../../../src/modules/application/queries'
import { expectIdle, runMutation, runQuery, stub } from '../queryHarness'
import { createTestQueryClient } from '../../test-utils'

afterEach(() => server.resetHandlers())

const RA = '/common/request-application'
const list = (rows: unknown[] = []) => ({ status: true, message: 'ok', data: rows, meta: { total: rows.length } })

describe('application list queries', () => {
  it('usePreQualificationApplications posts the filters', async () => {
    const seen = stub('post', `${RA}/pre-qualification`, list([{ id: 1 }]))

    const { result } = await runQuery(() => usePreQualificationApplications({ search: 'pia' }))

    expect(seen.bodies[0]).toEqual({ search: 'pia' })
    expect((result.current.data as any).data).toHaveLength(1)
  })

  it('useFundingApplications posts the filters', async () => {
    const seen = stub('post', `${RA}/funding-application`, list([{ id: 2 }]))

    await runQuery(() => useFundingApplications({ status: 'Submitted' }))

    expect(seen.bodies[0]).toEqual({ status: 'Submitted' })
  })

  it('useFundingRequests posts the filters', async () => {
    const seen = stub('post', '/common/funding-request', list([{ id: 3 }]))

    await runQuery(() => useFundingRequests({ page: 2 }))

    expect(seen.bodies[0]).toEqual({ page: 2 })
  })

  it('the three lists are cached separately even with identical filters', async () => {
    stub('post', `${RA}/pre-qualification`, list([{ id: 1 }]))
    stub('post', `${RA}/funding-application`, list([{ id: 2 }]))
    const queryClient = createTestQueryClient()

    await runQuery(() => usePreQualificationApplications({}), queryClient)
    await runQuery(() => useFundingApplications({}), queryClient)

    const base = queryKeys.application.list()
    expect((queryClient.getQueryData([...base, 'pre-qualification', {}]) as any).data[0].id).toBe(1)
    expect((queryClient.getQueryData([...base, 'funding', {}]) as any).data[0].id).toBe(2)
  })
})

describe('application detail queries', () => {
  it('each detail hook stays idle without an id', () => {
    expectIdle(() => usePreQualificationApplicationDetails(''))
    expectIdle(() => useFundingApplicationDetails(''))
    expectIdle(() => useFundingRequestDetails(''))
    expectIdle(() => useFundingApplicationAuditHistory(''))
  })

  it('usePreQualificationApplicationDetails fetches the application', async () => {
    stub('get', `${RA}/pre-qualification/5`, { status: true, data: { id: 5, gpt_status: 'COMPLETED' } })

    const { result } = await runQuery(() => usePreQualificationApplicationDetails(5))

    expect((result.current.data as any).data.id).toBe(5)
  })

  it('useFundingApplicationDetails fetches the application', async () => {
    stub('get', `${RA}/funding-application/6`, { status: true, data: { id: 6 } })

    const { result } = await runQuery(() => useFundingApplicationDetails(6))

    expect((result.current.data as any).data.id).toBe(6)
  })

  it('useFundingRequestDetails fetches the request', async () => {
    stub('get', '/common/funding-request/7', { status: true, data: { id: 7 } })

    const { result } = await runQuery(() => useFundingRequestDetails(7))

    expect((result.current.data as any).data.id).toBe(7)
  })

  it('useFundingApplicationAuditHistory posts its paging to the audit endpoint', async () => {
    const seen = stub('post', `${RA}/funding-application/6/audit-history`, list([{ id: 1, event: 'updated' }]))

    await runQuery(() => useFundingApplicationAuditHistory('6', { page: 1 }))

    expect(seen.bodies[0]).toEqual({ page: 1 })
  })

  // KNOWN BUG: pre-qualification, funding application and funding request
  // details all cache under queryKeys.application.detail(id). Their ids come
  // from different tables, so record 5 of one kind is served from the cache
  // entry of record 5 of another until the refetch lands (and
  // useRunAiPreQualification writes into that shared entry). Remove `.fails`
  // once each kind has its own key.
  it.fails('a pre-qualification and a funding application with the same id do not share a cache entry', async () => {
    stub('get', `${RA}/pre-qualification/5`, { status: true, data: { id: 5, kind: 'pre-qualification' } })
    stub('get', `${RA}/funding-application/5`, { status: true, data: { id: 5, kind: 'funding' } })
    const queryClient = createTestQueryClient()

    await runQuery(() => usePreQualificationApplicationDetails(5), queryClient)
    const cachedAfterFirst = queryClient.getQueryCache().findAll().length
    await runQuery(() => useFundingApplicationDetails(5), queryClient)

    expect(queryClient.getQueryCache().findAll().length).toBe(cachedAfterFirst + 1)
  })
})

describe('application summary queries', () => {
  it('useFundingApplicationStats gets the funding card summary', async () => {
    const seen = stub('get', `${RA}/funding-application/card-summary`, { status: true, data: { total: 4 } })

    const { result } = await runQuery(() => useFundingApplicationStats())

    expect(seen.calls).toBe(1)
    expect((result.current.data as any).data.total).toBe(4)
  })

  it('usePreQualificationStats gets the pre-qualification card summary', async () => {
    const seen = stub('get', `${RA}/pre-qualification/card-summary`, { status: true, data: { total: 9 } })

    const { result } = await runQuery(() => usePreQualificationStats())

    expect(seen.calls).toBe(1)
    expect((result.current.data as any).data.total).toBe(9)
  })
})

describe('application mutations', () => {
  it('useUpdateApplicationStatus posts the status and refreshes every application query', async () => {
    const seen = stub('post', `${RA}/pre-qualification/status-update`, { status: true })
    const payload = { id: 5, status: 'Approved', status_note: 'Looks good' }

    const { invalidated } = await runMutation(() => useUpdateApplicationStatus(), payload as never)

    expect(seen.bodies[0]).toEqual(payload)
    expect(invalidated).toEqual([queryKeys.application.all])
  })

  it('useUpdateFundingApplicationStatus posts the status and refreshes every application query', async () => {
    const seen = stub('post', `${RA}/funding-application/status-update`, { status: true })
    const payload = { id: 6, status: 'Funded' }

    const { invalidated } = await runMutation(() => useUpdateFundingApplicationStatus(), payload as never)

    expect(seen.bodies[0]).toEqual(payload)
    expect(invalidated).toEqual([queryKeys.application.all])
  })

  it('useSaveFundingApplicationCommission refreshes that application and the rest', async () => {
    const seen = stub('post', '/admin/funding-application/save-commission', { status: true })
    const payload = { funding_application_id: 6, admin_commission: 5 }

    const { invalidated } = await runMutation(() => useSaveFundingApplicationCommission(), payload as never)

    expect(seen.bodies[0]).toEqual(payload)
    expect(invalidated).toEqual([queryKeys.application.detail(6), queryKeys.application.all])
  })

  it('useUpdateFundingRequestStatus refreshes that request and the rest', async () => {
    const seen = stub('post', '/common/funding-request/status-update', { status: true })
    const payload = { id: 7, status: 'Approved' }

    const { invalidated } = await runMutation(() => useUpdateFundingRequestStatus(), payload as never)

    expect(seen.bodies[0]).toEqual(payload)
    expect(invalidated).toEqual([queryKeys.application.detail(7), queryKeys.application.all])
  })

  it('useAssignLenderToFundingRequest refreshes only that request', async () => {
    const seen = stub('post', '/common/funding-request/assign-lender', { status: true })
    const payload = { id: 7, lender_ids: [1, 2] }

    const { invalidated } = await runMutation(() => useAssignLenderToFundingRequest(), payload as never)

    expect(seen.bodies[0]).toEqual(payload)
    expect(invalidated).toEqual([queryKeys.application.detail(7)])
  })
})

describe('useRunAiPreQualification', () => {
  it('starts the run for the application and refreshes it', async () => {
    const seen = stub('post', `${RA}/pre-qualification/5/run-ai`, { status: true, data: {} })

    const { invalidated } = await runMutation(() => useRunAiPreQualification(), 5 as never)

    expect(seen.calls).toBe(1)
    expect(invalidated).toEqual([queryKeys.application.detail(5), queryKeys.application.all])
  })

  it('writes the returned application straight into the cached detail', async () => {
    stub('post', `${RA}/pre-qualification/5/run-ai`, { status: true, data: { application: { id: 5, gpt_status: 'PENDING' } } })
    const queryClient = createTestQueryClient()
    queryClient.setQueryData(queryKeys.application.detail(5), { status: true, data: { id: 5, gpt_status: null } })
    // Keep the entry as written so the assertion sees setQueryData, not a refetch.
    stub('get', `${RA}/pre-qualification/5`, { status: true, data: { id: 5, gpt_status: 'PENDING' } })

    await runMutation(() => useRunAiPreQualification(), 5 as never, queryClient)

    expect((queryClient.getQueryData(queryKeys.application.detail(5)) as any).data.gpt_status).toBe('PENDING')
  })

  it('does not invent a cache entry when the detail was never loaded', async () => {
    stub('post', `${RA}/pre-qualification/5/run-ai`, { status: true, data: { application: { id: 5 } } })
    const queryClient = createTestQueryClient()

    await runMutation(() => useRunAiPreQualification(), 5 as never, queryClient)

    expect(queryClient.getQueryData(queryKeys.application.detail(5))).toBeUndefined()
  })

  it('a failed run leaves the cache alone', async () => {
    stub('post', `${RA}/pre-qualification/5/run-ai`, { status: false, message: 'AI unavailable' }, 500)

    const { invalidated, error } = await runMutation(() => useRunAiPreQualification(), 5 as never)

    expect(error).toBeTruthy()
    expect(invalidated).toEqual([])
  })
})
