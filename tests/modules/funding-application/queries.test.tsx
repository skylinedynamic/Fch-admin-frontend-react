import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { server } from '../../mocks/server'
import { queryKeys } from '../../../src/lib/query/queryKeys'
import {
  useAttestation,
  useBusinessInfo,
  useDeleteFundingApplicationDocument,
  useDisclosuresConsent,
  useFederalCompliance,
  useFinancialInfo,
  useFundingApplicationDocuments,
  useFundingRequest,
  useOwnershipInfo,
  useSaveAttestation,
  useSaveBusinessInfo,
  useSaveDisclosuresConsent,
  useSaveFederalCompliance,
  useSaveFinancialInfo,
  useSaveFundingRequest,
  useSaveOwnershipInfo,
  useUploadFundingApplicationDocuments,
  useValidateCoBorrower,
} from '../../../src/modules/funding-application/queries'
import { isEditConfirmationCancelled } from '../../../src/modules/funding-application/editConfirmation'
import {
  resolveEditConfirmation,
  setEditRequiresConfirmation,
  useEditConfirmationStore,
} from '../../../src/store/fundApplication/editConfirmationStore'
import { createTestQueryClient } from '../../test-utils'
import { expectIdle, runMutation, runQuery, stub, trackInvalidations, wrapperFor } from '../queryHarness'

const FA = '/common/funding-application'
const fa = queryKeys.fundingApplication

const resetConfirmation = () =>
  useEditConfirmationStore.setState({
    requiresConfirmation: false,
    isResolving: false,
    promptOnOpen: null,
    hasConfirmed: false,
    isOpen: false,
    resolver: null,
  })

beforeEach(resetConfirmation)
afterEach(() => {
  server.resetHandlers()
  resetConfirmation()
})

describe.each([
  { name: 'useBusinessInfo', hook: useBusinessInfo, path: 'business-info', key: fa.businessInfo() },
  { name: 'useOwnershipInfo', hook: useOwnershipInfo, path: 'ownership-info', key: fa.ownershipInfo() },
  { name: 'useFinancialInfo', hook: useFinancialInfo, path: 'financial-info', key: fa.financialInfo() },
  { name: 'useDisclosuresConsent', hook: useDisclosuresConsent, path: 'disclosures-and-consent', key: fa.disclosuresConsent() },
  { name: 'useFederalCompliance', hook: useFederalCompliance, path: 'federal-compliance-disclosures', key: fa.federalCompliance() },
])('$name', ({ hook, path, key }) => {
  it('reads the current application when no funding request is given', async () => {
    const seen = stub('get', `${FA}/${path}`, { status: true, data: { id: 1 } })

    const { result, queryClient } = await runQuery(() => hook())

    expect(new URL(seen.urls[0]).searchParams.has('funding_request_id')).toBe(false)
    expect(result.current.data).toEqual({ id: 1 })
    expect(queryClient.getQueryData([...key, 'current'])).toEqual({ id: 1 })
  })

  it('scopes the read and the cache entry to a funding request', async () => {
    const seen = stub('get', `${FA}/${path}`, { status: true, data: { id: 2 } })

    const { queryClient } = await runQuery(() => hook(77))

    expect(new URL(seen.urls[0]).searchParams.get('funding_request_id')).toBe('77')
    expect(queryClient.getQueryData([...key, 77])).toEqual({ id: 2 })
  })

  it('does not fetch when disabled', () => {
    expectIdle(() => hook(77, { enabled: false }))
  })
})

describe('useFundingRequest', () => {
  it('keys the cache by the id as a string', async () => {
    stub('get', `${FA}/funding-request`, { status: true, data: { id: 5 } })

    const { queryClient } = await runQuery(() => useFundingRequest(5))

    expect(queryClient.getQueryData([...fa.fundingRequest(), '5'])).toEqual({ id: 5 })
  })

  it('uses the "current" entry when no id is given', async () => {
    stub('get', `${FA}/funding-request`, { status: true, data: { id: 6 } })

    const { queryClient } = await runQuery(() => useFundingRequest())

    expect(queryClient.getQueryData([...fa.fundingRequest(), 'current'])).toEqual({ id: 6 })
  })
})

describe('useAttestation', () => {
  it('reads the attestation for a funding request', async () => {
    const seen = stub('get', `${FA}/attestation-authorization`, { status: true, data: { signed: true } })

    const { result } = await runQuery(() => useAttestation(9))

    expect(new URL(seen.urls[0]).searchParams.get('funding_request_id')).toBe('9')
    expect(result.current.data).toEqual({ signed: true })
  })
})

describe('useFundingApplicationDocuments', () => {
  it('stays idle without an application id', () => {
    expectIdle(() => useFundingApplicationDocuments(null))
  })

  it('stays idle when explicitly disabled, even with an id', () => {
    expectIdle(() => useFundingApplicationDocuments(4, { enabled: false }))
  })

  it('lists the documents of an application', async () => {
    stub('get', `${FA}/documents/4`, { status: true, data: [{ id: 1, name: 'bank.pdf' }] })

    const { queryClient } = await runQuery(() => useFundingApplicationDocuments(4))

    expect(queryClient.getQueryData(fa.documents(4))).toBeDefined()
  })
})

describe.each([
  { name: 'useSaveBusinessInfo', hook: useSaveBusinessInfo, path: 'business-info', own: fa.businessInfo() },
  { name: 'useSaveOwnershipInfo', hook: useSaveOwnershipInfo, path: 'ownership-info', own: fa.ownershipInfo() },
  { name: 'useSaveFinancialInfo', hook: useSaveFinancialInfo, path: 'financial-info', own: fa.financialInfo() },
  { name: 'useSaveDisclosuresConsent', hook: useSaveDisclosuresConsent, path: 'disclosures-and-consent', own: fa.disclosuresConsent() },
  { name: 'useSaveFederalCompliance', hook: useSaveFederalCompliance, path: 'federal-compliance-disclosures', own: fa.federalCompliance() },
])('$name', ({ hook, path, own }) => {
  it('posts the step and refreshes it, the funding request, the dashboard and the request list', async () => {
    const seen = stub('post', `${FA}/${path}`, { status: true, data: { id: 1 } })
    const payload = { id: 1, value: 'x' }

    const { invalidated, outcome } = await runMutation(() => hook() as never, payload as never)

    expect(seen.bodies[0]).toEqual(payload)
    expect(outcome).toEqual({ id: 1 })
    expect(invalidated).toEqual([own, fa.fundingRequest(), ['dashboard'], ['funding-requests']])
  })

  it('does not call the API when the borrower cancels the edit confirmation', async () => {
    const seen = stub('post', `${FA}/${path}`, { status: true, data: {} })
    setEditRequiresConfirmation(true)
    const queryClient = createTestQueryClient()
    const invalidated = trackInvalidations(queryClient)
    const { result } = renderHook(() => hook(), { wrapper: wrapperFor(queryClient) })

    const pending = (result.current as any).mutateAsync({ id: 1 }).catch((e: unknown) => e)
    await waitFor(() => expect(useEditConfirmationStore.getState().isOpen).toBe(true))
    resolveEditConfirmation(false)
    const error = await pending

    expect(isEditConfirmationCancelled(error)).toBe(true)
    expect(seen.calls).toBe(0)
    expect(invalidated).toEqual([])
  })
})

describe('useSaveFundingRequest', () => {
  it('posts the request and refreshes it, the dashboard and the request list', async () => {
    const seen = stub('post', `${FA}/funding-request`, { status: true, data: { id: 3 } })
    const payload = { requested_amount: 50000 }

    const { invalidated } = await runMutation(() => useSaveFundingRequest() as never, payload as never)

    expect(seen.bodies[0]).toEqual(payload)
    expect(invalidated).toEqual([fa.fundingRequest(), ['dashboard'], ['funding-requests']])
  })
})

describe('useSaveAttestation', () => {
  it('submits without asking for an edit confirmation, even while one is required', async () => {
    const seen = stub('post', `${FA}/attestation-authorization`, { status: true, data: { signed: true } })
    setEditRequiresConfirmation(true)

    const { invalidated } = await runMutation(() => useSaveAttestation(), { signature: 'Jo' } as never)

    expect(seen.calls).toBe(1)
    expect(useEditConfirmationStore.getState().isOpen).toBe(false)
    expect(invalidated).toEqual([['dashboard'], ['funding-requests'], ['my-applications']])
  })
})

describe('document mutations', () => {
  it('useUploadFundingApplicationDocuments posts the files and refreshes that application documents', async () => {
    const seen = stub('post', `${FA}/documents/upload`, { status: true, data: [] })
    const payload = { funding_application_id: 4, file_paths: ['a.pdf'] }

    const { invalidated } = await runMutation(() => useUploadFundingApplicationDocuments(), payload as never)

    expect(seen.bodies[0]).toEqual(payload)
    expect(invalidated).toEqual([fa.documents(4)])
  })

  it('useDeleteFundingApplicationDocument deletes by document id', async () => {
    const seen = stub('delete', `${FA}/documents/11`, { message: 'deleted' })

    const { invalidated, outcome } = await runMutation(() => useDeleteFundingApplicationDocument(), 11 as never)

    expect(seen.calls).toBe(1)
    expect(outcome).toEqual({ message: 'deleted' })
    // The hook leaves refreshing the list to the caller.
    expect(invalidated).toEqual([])
  })

  it('useValidateCoBorrower posts the co-borrower for validation', async () => {
    const seen = stub('post', `${FA}/co-borrower-validation`, { status: true, data: { valid: true } })
    const payload = { email: 'co@x.com', ssn: '***' }

    await runMutation(() => useValidateCoBorrower(), payload as never)

    expect(seen.bodies[0]).toEqual(payload)
  })
})
