import { afterEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { server } from '../../mocks/server'
import { createTestQueryClient } from '../../test-utils'
import { fetchFundingSequenceOptions, fetchFundingTypes } from '../../../src/modules/funding-application/services'
import {
  useAttestation,
  useBusinessInfo,
  useDisclosuresConsent,
  useFederalCompliance,
  useFinancialInfo,
  useFundingSequenceOptions,
  useOwnershipInfo,
} from '../../../src/modules/funding-application/queries'

/**
 * The option lists of the Funding Request step: the funding types and the
 * funding sequences offered for one (GET /common/funding-sequences).
 */
afterEach(() => server.resetHandlers())

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={createTestQueryClient()}>{children}</QueryClientProvider>
)

describe('funding-application option lists', () => {
  it('asks for the sequences of the funding type given', async () => {
    let asked = ''
    server.use(
      http.get('*/common/funding-sequences', ({ request }) => {
        asked = new URL(request.url).searchParams.get('funding_type') ?? ''
        return HttpResponse.json({ status: true, data: [{ id: 6, name: 'Term Loans' }] })
      })
    )

    expect(await fetchFundingSequenceOptions('Term Loan')).toEqual([{ id: 6, name: 'Term Loans' }])
    expect(asked).toBe('Term Loan')
  })

  it('gives empty lists when the API sends none', async () => {
    server.use(
      http.get('*/common/funding-sequences', () => HttpResponse.json({ status: true })),
      http.get('*/common/funding-types', () => HttpResponse.json({ status: true }))
    )

    expect(await fetchFundingSequenceOptions('Term Loan')).toEqual([])
    expect(await fetchFundingTypes()).toEqual([])
  })

  it('loads the sequences only for a funding type, and only when asked to', async () => {
    let calls = 0
    server.use(
      http.get('*/common/funding-sequences', () => {
        calls++
        return HttpResponse.json({ status: true, data: [{ id: 6, name: 'Term Loans' }] })
      })
    )

    const none = renderHook(() => useFundingSequenceOptions(null), { wrapper })
    const off = renderHook(() => useFundingSequenceOptions('Term Loan', false), { wrapper })
    const on = renderHook(() => useFundingSequenceOptions('Term Loan'), { wrapper })

    await waitFor(() => expect(on.result.current.data).toEqual([{ id: 6, name: 'Term Loans' }]))
    expect(none.result.current.fetchStatus).toBe('idle')
    expect(off.result.current.fetchStatus).toBe('idle')
    expect(calls).toBe(1)
  })
})

describe('funding-application step queries', () => {
  // Each step's query, opened on nothing yet (no request, no application) and
  // switched off: it waits, and asks nothing.
  it.each([
    ['attestation', useAttestation],
    ['business info', useBusinessInfo],
    ['ownership info', useOwnershipInfo],
    ['financial info', useFinancialInfo],
    ['disclosures and consent', useDisclosuresConsent],
    ['federal compliance', useFederalCompliance],
  ])('%s waits while there is nothing to load, and loads an application by its id', async (_, useStep) => {
    const asked: string[] = []
    server.use(
      http.get('*', ({ request }) => {
        asked.push(new URL(request.url).searchParams.get('funding_application_id') ?? '')
        return HttpResponse.json({ status: true, data: { id: 11 } })
      })
    )

    const idle = renderHook(() => (useStep as any)(null, { enabled: false }), { wrapper })
    expect(idle.result.current.fetchStatus).toBe('idle')

    const opened = renderHook(() => (useStep as any)(undefined, { fundingApplicationId: 11 }), { wrapper })
    await waitFor(() => expect(opened.result.current.isSuccess).toBe(true))
    expect(asked).toEqual(['11'])
  })
})
