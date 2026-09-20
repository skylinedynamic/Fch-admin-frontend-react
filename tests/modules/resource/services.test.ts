import { afterEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../../mocks/server'
import {
  fetchGroupedResources,
  fetchResourcesByType,
  fetchResourceById,
  createResource,
  updateResource,
  deleteResource,
  downloadResource,
  getResourceNextId,
} from '../../../src/modules/resource/services'
import type { ResourceFormData } from '../../../src/modules/resource/types'

afterEach(() => server.resetHandlers())

describe('resource read services', () => {
  it('fetchGroupedResources hits the partner-accessible /common/resources route and returns the ApiResponse body', async () => {
    server.use(
      http.get('*/common/resources', () =>
        HttpResponse.json({ data: { legal_registration: [], business_services: [], download_assets: [], education_help: [], training_academy: [] } })
      )
    )
    await expect(fetchGroupedResources()).resolves.toEqual({
      data: { legal_registration: [], business_services: [], download_assets: [], education_help: [], training_academy: [] },
    })
  })

  it('fetchResourcesByType hits the admin type-scoped route', async () => {
    let calledPath = ''
    server.use(
      http.get('*/admin/resources/type/:type', ({ request, params }) => {
        calledPath = new URL(request.url).pathname
        expect(params.type).toBe('legal_registration')
        return HttpResponse.json({ data: [] })
      })
    )
    await fetchResourcesByType('legal_registration')
    expect(calledPath.endsWith('/admin/resources/type/legal_registration')).toBe(true)
  })

  it('fetchResourceById hits the partner-accessible id-scoped route', async () => {
    let calledPath = ''
    server.use(
      http.get('*/common/resources/:id', ({ request }) => {
        calledPath = new URL(request.url).pathname
        return HttpResponse.json({ data: { id: 5 } })
      })
    )
    await fetchResourceById(5)
    expect(calledPath.endsWith('/common/resources/5')).toBe(true)
  })

  it('getResourceNextId returns the raw body', async () => {
    server.use(http.get('*/admin/resources/next-id', () => HttpResponse.json({ next_id: 7 })))
    await expect(getResourceNextId()).resolves.toEqual({ next_id: 7 })
  })

  it('downloadResource requests a blob response type from the download route', async () => {
    server.use(
      http.get('*/common/resources/download/:id', () => new HttpResponse(new Blob(['file-bytes']), { status: 200 }))
    )
    const res = await downloadResource(9)
    expect(res.data).toBeInstanceOf(Blob)
  })
})

describe('createResource FormData construction', () => {
  const baseData: ResourceFormData = {
    resource_type: 'legal_registration',
    title: 'Some Title',
    status: true,
    is_partner: false,
    is_borrower: true,
    overview: ['first', 'second'],
    providers: [
      { name: 'Vendor A', desc: 'Desc', desc_list: ['a', 'b'], is_recommended: true, btn_label: 'Go', link: 'https://x', sort_order: 1 },
    ],
  }

  it('serializes booleans as "1"/"0", simple arrays by index, and skips null/undefined fields', async () => {
    let received: FormData | null = null
    server.use(
      http.post('*/admin/resources', async ({ request }) => {
        received = await request.formData()
        return HttpResponse.json({ data: { id: 1 } })
      })
    )
    await createResource(baseData)

    expect(received).not.toBeNull()
    const fd = received as unknown as FormData
    expect(fd.get('resource_type')).toBe('legal_registration')
    expect(fd.get('title')).toBe('Some Title')
    // booleans -> '1'/'0'
    expect(fd.get('status')).toBe('1')
    expect(fd.get('is_partner')).toBe('0')
    expect(fd.get('is_borrower')).toBe('1')
    // simple array -> indexed keys
    expect(fd.get('overview[0]')).toBe('first')
    expect(fd.get('overview[1]')).toBe('second')
    // nested provider object -> indexed sub-keys, nested array -> indexed sub-sub-keys
    expect(fd.get('providers[0][name]')).toBe('Vendor A')
    expect(fd.get('providers[0][is_recommended]')).toBe('1')
    expect(fd.get('providers[0][desc_list][0]')).toBe('a')
    expect(fd.get('providers[0][desc_list][1]')).toBe('b')
    // subtitle was undefined on baseData and must be omitted entirely
    expect(fd.has('subtitle')).toBe(false)
  })

  it('sends multipart/form-data content type', async () => {
    let contentType = ''
    server.use(
      http.post('*/admin/resources', async ({ request }) => {
        contentType = request.headers.get('content-type') || ''
        return HttpResponse.json({ data: { id: 1 } })
      })
    )
    await createResource(baseData)
    expect(contentType).toContain('multipart/form-data')
  })
})

describe('updateResource FormData construction', () => {
  it('appends _method=PUT for Laravel method spoofing and posts to the id-scoped route', async () => {
    let received: FormData | null = null
    let calledPath = ''
    server.use(
      http.post('*/admin/resources/:id', async ({ request }) => {
        calledPath = new URL(request.url).pathname
        received = await request.formData()
        return HttpResponse.json({ data: { id: 3 } })
      })
    )
    await updateResource(3, { resource_type: 'business_services', title: 'Updated', status: false })

    expect(calledPath.endsWith('/admin/resources/3')).toBe(true)
    const fd = received as unknown as FormData
    expect(fd.get('_method')).toBe('PUT')
    expect(fd.get('status')).toBe('0')
  })
})

describe('deleteResource', () => {
  it('sends a DELETE to the id-scoped admin route', async () => {
    let calledPath = ''
    let method = ''
    server.use(
      http.delete('*/admin/resources/:id', ({ request }) => {
        calledPath = new URL(request.url).pathname
        method = request.method
        return new HttpResponse(null, { status: 204 })
      })
    )
    await deleteResource(4)
    expect(calledPath.endsWith('/admin/resources/4')).toBe(true)
    expect(method).toBe('DELETE')
  })
})
