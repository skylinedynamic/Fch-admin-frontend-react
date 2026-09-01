import { afterEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../../mocks/server'
import {
  fetchFundingSequencings,
  getFundingSequencing,
  createFundingSequencing,
  updateFundingSequencingStatus,
  deleteFundingSequencingVisibilities,
  getFundingGroups,
  getFundingTypes,
  fetchBorrowerFunding,
} from '../../../src/modules/funding/services'

afterEach(() => server.resetHandlers())

describe('funding services', () => {
  it('fetchFundingSequencings posts the filter payload, defaulting to {}', async () => {
    let receivedBody: unknown = null
    server.use(
      http.post('*/common/funding-sequencings/fetch', async ({ request }) => {
        receivedBody = await request.json()
        return HttpResponse.json({ status: true, data: [] })
      })
    )
    await fetchFundingSequencings()
    expect(receivedBody).toEqual({})
  })

  it('getFundingSequencing GETs by id', async () => {
    server.use(http.get('*/admin/funding-sequencings/3', () => HttpResponse.json({ status: true, data: { id: 3 } })))
    await expect(getFundingSequencing(3)).resolves.toEqual({ status: true, data: { id: 3 } })
  })

  it('createFundingSequencing posts the payload', async () => {
    let receivedBody: unknown = null
    server.use(
      http.post('*/admin/funding-sequencings', async ({ request }) => {
        receivedBody = await request.json()
        return HttpResponse.json({ status: true, data: { id: 1 } })
      })
    )
    await createFundingSequencing({ name: 'Primary Sequence' } as any)
    expect(receivedBody).toEqual({ name: 'Primary Sequence' })
  })

  it('updateFundingSequencingStatus PATCHes only the status field', async () => {
    let receivedBody: unknown = null
    server.use(
      http.patch('*/admin/funding-sequencings/3/status', async ({ request }) => {
        receivedBody = await request.json()
        return HttpResponse.json({ status: true })
      })
    )
    await updateFundingSequencingStatus(3, 'Inactive')
    expect(receivedBody).toEqual({ status: 'Inactive' })
  })

  it('deleteFundingSequencingVisibilities DELETEs with a request body payload', async () => {
    let receivedBody: unknown = null
    server.use(
      http.delete('*/admin/funding-sequencings/3/visibilities', async ({ request }) => {
        receivedBody = await request.json()
        return HttpResponse.json({ status: true })
      })
    )
    await deleteFundingSequencingVisibilities(3, { lender_ids: [1, 2] } as any)
    expect(receivedBody).toEqual({ lender_ids: [1, 2] })
  })

  it('getFundingGroups and getFundingTypes GET their respective lists', async () => {
    server.use(http.get('*/admin/funding-groups', () => HttpResponse.json({ status: true, data: [] })))
    await expect(getFundingGroups()).resolves.toEqual({ status: true, data: [] })

    server.use(http.get('*/admin/funding-types', () => HttpResponse.json({ status: true, data: [] })))
    await expect(getFundingTypes()).resolves.toEqual({ status: true, data: [] })
  })

  it('fetchBorrowerFunding GETs the grouped sequencing list with query params', async () => {
    let receivedUrl = ''
    server.use(
      http.get('*/common/funding-sequencings/grouped', ({ request }) => {
        receivedUrl = request.url
        return HttpResponse.json({ status: true, data: [] })
      })
    )
    await fetchBorrowerFunding({ funding_request_id: 7 })
    expect(receivedUrl).toContain('funding_request_id=7')
  })
})
