import { afterEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../../mocks/server'
import * as leadServices from '../../../src/modules/leads/services'
import { fetchLeads, getLead, convertLead, deleteLeads, revealLeadField } from '../../../src/modules/leads/services'

afterEach(() => server.resetHandlers())

describe('leads services', () => {
  it('fetchLeads posts the filter payload, defaulting to {}', async () => {
    let receivedBody: unknown = null
    server.use(
      http.post('*/common/leads/fetch-leads', async ({ request }) => {
        receivedBody = await request.json()
        return HttpResponse.json({ status: true, data: [] })
      })
    )
    await fetchLeads()
    expect(receivedBody).toEqual({})
  })

  it('getLead fetches by id', async () => {
    server.use(http.get('*/common/leads/4', () => HttpResponse.json({ status: true, data: { id: 4 } })))
    await expect(getLead(4)).resolves.toEqual({ status: true, data: { id: 4 } })
  })

  it('convertLead posts to the id-scoped convert route', async () => {
    let calledPath = ''
    server.use(
      http.post('*/common/leads/4/convert', ({ request }) => {
        calledPath = new URL(request.url).pathname
        return HttpResponse.json({ status: true, message: 'Converted' })
      })
    )
    await convertLead(4)
    expect(calledPath.endsWith('/common/leads/4/convert')).toBe(true)
  })

  it('has no single-lead delete - one lead goes through deleteLeads too', async () => {
    expect('deleteLead' in leadServices).toBe(false)

    let receivedBody: unknown = null
    server.use(
      http.post('*/common/leads/multiple-delete', async ({ request }) => {
        receivedBody = await request.json()
        return HttpResponse.json({ status: true, message: 'Lead deleted successfully.', data: { deleted: 1 } })
      })
    )
    await deleteLeads([4])
    expect(receivedBody).toEqual({ ids: [4] })
  })

  it('deleteLeads posts every id in one call to the bulk delete route', async () => {
    let receivedBody: unknown = null
    server.use(
      http.post('*/common/leads/multiple-delete', async ({ request }) => {
        receivedBody = await request.json()
        return HttpResponse.json({ status: true, message: 'Lead deleted successfully.', data: { deleted: 3 } })
      })
    )
    await expect(deleteLeads([4, 5, 6])).resolves.toEqual({
      status: true,
      message: 'Lead deleted successfully.',
      data: { deleted: 3 },
    })
    expect(receivedBody).toEqual({ ids: [4, 5, 6] })
  })

  // R3-BUG-004: a lead's SSN and EIN arrive masked; the full number is one logged call.
  it('revealLeadField posts the field and returns the number in full', async () => {
    let body: unknown = null
    server.use(
      http.post('*/common/leads/:id/reveal', async ({ request, params }) => {
        body = { id: params.id, ...(await request.json() as object) }
        return HttpResponse.json({ status: true, data: { field: 'ssn', value: '123456789' } })
      })
    )
    await expect(revealLeadField(7, 'ssn')).resolves.toBe('123456789')
    expect(body).toEqual({ id: '7', field: 'ssn' })
  })

  it('revealLeadField gives null when no number is on file', async () => {
    server.use(http.post('*/common/leads/:id/reveal', () => HttpResponse.json({ status: true, data: { field: 'business_ein', value: null } })))
    await expect(revealLeadField(7, 'business_ein')).resolves.toBeNull()
  })
})
