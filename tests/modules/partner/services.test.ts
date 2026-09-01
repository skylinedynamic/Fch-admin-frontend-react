import { afterEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../../mocks/server'
import { createPartner, updatePartner, fetchSubscriptionStats, getPartner, fetchPartnerById } from '../../../src/modules/partner/services'

afterEach(() => server.resetHandlers())

describe('partner services', () => {
  it('createPartner posts a plain object with default JSON content-type', async () => {
    let receivedContentType: string | null = null
    server.use(
      http.post('*/admin/partners', ({ request }) => {
        receivedContentType = request.headers.get('content-type')
        return HttpResponse.json({ status: true, data: { id: 1 } })
      })
    )
    await createPartner({ name: 'Acme Partner' })
    expect(receivedContentType).toContain('application/json')
  })

  it('createPartner sends multipart/form-data when given FormData (e.g. with a logo file)', async () => {
    let receivedContentType: string | null = null
    server.use(
      http.post('*/admin/partners', ({ request }) => {
        receivedContentType = request.headers.get('content-type')
        return HttpResponse.json({ status: true, data: { id: 1 } })
      })
    )
    const form = new FormData()
    form.append('name', 'Acme Partner')
    await createPartner(form)
    expect(receivedContentType).toContain('multipart/form-data')
  })

  it('updatePartner with FormData appends _method=PUT and posts (Laravel method-spoofing)', async () => {
    let receivedMethodField: string | null = null
    let calledPath = ''
    server.use(
      http.post('*/admin/partners/9', async ({ request }) => {
        calledPath = new URL(request.url).pathname
        const body = await request.formData()
        receivedMethodField = body.get('_method') as string
        return HttpResponse.json({ status: true, data: { id: 9 } })
      })
    )
    const form = new FormData()
    form.append('name', 'Updated Name')
    await updatePartner(9, form)
    expect(calledPath.endsWith('/admin/partners/9')).toBe(true)
    expect(receivedMethodField).toBe('PUT')
  })

  it('updatePartner with a plain object uses a real PUT request', async () => {
    let calledMethod = ''
    server.use(
      http.put('*/admin/partners/9', ({ request }) => {
        calledMethod = request.method
        return HttpResponse.json({ status: true, data: { id: 9 } })
      })
    )
    await updatePartner(9, { name: 'Updated Name' })
    expect(calledMethod).toBe('PUT')
  })

  it('getPartner and its fetchPartnerById alias resolve the same endpoint', async () => {
    expect(fetchPartnerById).toBe(getPartner)
    server.use(http.get('*/admin/partners-details/4', () => HttpResponse.json({ id: 4 })))
    await expect(getPartner(4)).resolves.toEqual({ id: 4 })
  })

  it('fetchSubscriptionStats reshapes the fetch-all response into {status, message, data: stats}', async () => {
    server.use(
      http.post('*/common/subscriptions/fetch-all', () =>
        HttpResponse.json({ status: true, message: 'ok', data: [{ id: 1 }], stats: { total: 42 } })
      )
    )
    await expect(fetchSubscriptionStats()).resolves.toEqual({ status: true, message: 'ok', data: { total: 42 } })
  })
})
