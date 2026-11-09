import { afterEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../../mocks/server'
import {
  fetchBusinessInfo,
  fetchOwnershipInfo,
  fetchFinancialInfo,
  fetchDisclosuresConsent,
  fetchFundingRequest,
  fetchFederalCompliance,
  fetchAttestation,
} from '../../../src/modules/funding-application/services'

/**
 * F169: the edit wizard reads an application by its own id when it was opened
 * on one (/...funding/{id}/edit) - an application converted from a loan
 * application has no funding request to be read by. The application id wins.
 */
afterEach(() => server.resetHandlers())

const reads = [
  ['business-info', fetchBusinessInfo],
  ['ownership-info', fetchOwnershipInfo],
  ['financial-info', fetchFinancialInfo],
  ['disclosures-and-consent', fetchDisclosuresConsent],
  ['funding-request', fetchFundingRequest],
  ['federal-compliance-disclosures', fetchFederalCompliance],
  ['attestation-authorization', fetchAttestation],
] as const

const paramsFor = async (step: string, call: () => Promise<unknown>) => {
  let params: URLSearchParams | null = null
  server.use(
    http.get(`*/common/funding-application/${step}`, ({ request }) => {
      params = new URL(request.url).searchParams
      return HttpResponse.json({ status: true, message: 'ok', data: {} })
    })
  )
  await call()
  return params as unknown as URLSearchParams
}

describe('wizard reads by application id', () => {
  it.each(reads)('%s sends only funding_application_id when the wizard has it', async (step, fetchStep) => {
    const params = await paramsFor(step, () => fetchStep(29, 80))

    expect(params.get('funding_application_id')).toBe('80')
    expect(params.has('funding_request_id')).toBe(false)
  })

  it.each(reads)('%s still reads by funding_request_id without one', async (step, fetchStep) => {
    const params = await paramsFor(step, () => fetchStep(29, null))

    expect(params.get('funding_request_id')).toBe('29')
    expect(params.has('funding_application_id')).toBe(false)
  })

  it.each(reads)('%s sends neither with nothing to read by', async (step, fetchStep) => {
    const params = await paramsFor(step, () => fetchStep())

    expect([...params.keys()]).toEqual([])
  })
})
