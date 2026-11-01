import { afterEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../../mocks/server'
import { fetchTiers, createTier, updateTierVendor, deleteTiers, deleteTierTask, deleteTierTasks } from '../../../src/modules/tiers/services'

afterEach(() => server.resetHandlers())

describe('tiers services', () => {
  it('fetchTiers posts the filter payload', async () => {
    let receivedBody: unknown = null
    server.use(
      http.post('*/admin/credit-builder/tiers/fetch-tiers', async ({ request }) => {
        receivedBody = await request.json()
        return HttpResponse.json({ status: true, data: [] })
      })
    )
    await fetchTiers({ search: 'tier 1' })
    expect(receivedBody).toEqual({ search: 'tier 1' })
  })

  it('createTier posts the payload', async () => {
    let receivedBody: unknown = null
    server.use(
      http.post('*/admin/credit-builder/tiers', async ({ request }) => {
        receivedBody = await request.json()
        return HttpResponse.json({ id: 1 })
      })
    )
    await createTier({ name: 'Tier 1' } as any)
    expect(receivedBody).toEqual({ name: 'Tier 1' })
  })

  it('deleteTiers posts the id list to the bulk-delete route', async () => {
    let receivedBody: unknown = null
    server.use(
      http.post('*/admin/credit-builder/tiers-multiple-delete', async ({ request }) => {
        receivedBody = await request.json()
        return HttpResponse.json({ status: true })
      })
    )
    await deleteTiers([1, 2])
    expect(receivedBody).toEqual({ ids: [1, 2] })
  })

  // BUG-095: the API has no single tier-task delete - DELETE tier-tasks/{id} was a 405.
  it('deleteTierTask posts the one id to the bulk-delete route', async () => {
    let receivedBody: unknown = null
    server.use(
      http.post('*/admin/credit-builder/tier-tasks-multiple-delete', async ({ request }) => {
        receivedBody = await request.json()
        return HttpResponse.json({ status: true })
      })
    )
    await deleteTierTask(9)
    expect(receivedBody).toEqual({ ids: [9] })
  })

  it('a refused delete carries the API’s message', async () => {
    server.use(
      http.post('*/admin/credit-builder/tier-tasks-multiple-delete', () =>
        HttpResponse.json({ status: false, message: 'Clients are already using these tasks' }, { status: 422 })
      )
    )
    await expect(deleteTierTasks([9])).rejects.toMatchObject({ response: { data: { message: 'Clients are already using these tasks' } } })
  })
})

describe('updateTierVendor — FormData vs plain-object branching', () => {
  it('sends multipart/form-data and POSTs when given FormData (e.g. with a logo)', async () => {
    let calledMethod = ''
    let receivedContentType: string | null = null
    server.use(
      http.post('*/admin/credit-builder/vendors/5', ({ request }) => {
        calledMethod = request.method
        receivedContentType = request.headers.get('content-type')
        return HttpResponse.json({ id: 5 })
      })
    )
    const form = new FormData()
    form.append('name', 'Vendor A')
    await updateTierVendor(5, form)
    expect(calledMethod).toBe('POST')
    expect(receivedContentType).toContain('multipart/form-data')
  })

  it('issues a real PUT when given a plain object', async () => {
    let calledMethod = ''
    server.use(
      http.put('*/admin/credit-builder/vendors/5', ({ request }) => { calledMethod = request.method; return HttpResponse.json({ id: 5 }) })
    )
    await updateTierVendor(5, { name: 'Vendor A' } as any)
    expect(calledMethod).toBe('PUT')
  })
})
