import { afterEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../../mocks/server'
import { cmsService } from '../../../src/modules/cms/services'

afterEach(() => server.resetHandlers())

describe('cmsService.saveBlog — create vs. update branching', () => {
  it('POSTs to the collection route when no id is given (create)', async () => {
    let calledPath = ''
    server.use(
      http.post('*/admin/cms/blogs', ({ request }) => {
        calledPath = new URL(request.url).pathname
        return HttpResponse.json({ status: true, data: { id: 1 } })
      })
    )
    await cmsService.saveBlog(undefined, new FormData())
    expect(calledPath.endsWith('/admin/cms/blogs')).toBe(true)
  })

  it('POSTs to the id-scoped route when an id is given (update)', async () => {
    let calledPath = ''
    server.use(
      http.post('*/admin/cms/blogs/7', ({ request }) => {
        calledPath = new URL(request.url).pathname
        return HttpResponse.json({ status: true, data: { id: 7 } })
      })
    )
    await cmsService.saveBlog(7, new FormData())
    expect(calledPath.endsWith('/admin/cms/blogs/7')).toBe(true)
  })
})

describe('cmsService.saveSeoSetting — create vs. update branching', () => {
  it('POSTs to /store when no id is given (create)', async () => {
    let calledPath = ''
    server.use(
      http.post('*/admin/cms/seo-settings/store', ({ request }) => {
        calledPath = new URL(request.url).pathname
        return HttpResponse.json({ status: true, data: { id: 1 } })
      })
    )
    await cmsService.saveSeoSetting(undefined, new FormData())
    expect(calledPath.endsWith('/admin/cms/seo-settings/store')).toBe(true)
  })

  it('POSTs to the id-scoped route when an id is given (update)', async () => {
    let calledPath = ''
    server.use(
      http.post('*/admin/cms/seo-settings/3', ({ request }) => {
        calledPath = new URL(request.url).pathname
        return HttpResponse.json({ status: true, data: { id: 3 } })
      })
    )
    await cmsService.saveSeoSetting(3, new FormData())
    expect(calledPath.endsWith('/admin/cms/seo-settings/3')).toBe(true)
  })
})

describe('cmsService — categories/tags/site settings', () => {
  it('deleteBlogs posts the id list to the bulk-delete route', async () => {
    let receivedBody: unknown = null
    server.use(
      http.post('*/admin/cms/blogs-multiple-delete', async ({ request }) => {
        receivedBody = await request.json()
        return HttpResponse.json({ status: true, message: 'Deleted' })
      })
    )
    await cmsService.deleteBlogs([1, 2, 3])
    expect(receivedBody).toEqual({ ids: [1, 2, 3] })
  })

  it('fetchCategories/fetchTags return their list envelopes', async () => {
    server.use(
      http.get('*/admin/cms/blog-categories', () => HttpResponse.json({ status: true, data: [{ id: 1 }] })),
      http.get('*/admin/cms/blog-tags', () => HttpResponse.json({ status: true, data: [{ id: 2 }] }))
    )
    await expect(cmsService.fetchCategories()).resolves.toEqual({ status: true, data: [{ id: 1 }] })
    await expect(cmsService.fetchTags()).resolves.toEqual({ status: true, data: [{ id: 2 }] })
  })

  it('updateSiteSettings posts multipart form data', async () => {
    let receivedContentType: string | null = null
    server.use(
      http.post('*/admin/cms/site-settings', ({ request }) => {
        receivedContentType = request.headers.get('content-type')
        return HttpResponse.json({ status: true, data: {} })
      })
    )
    await cmsService.updateSiteSettings(new FormData())
    expect(receivedContentType).toContain('multipart/form-data')
  })
})
