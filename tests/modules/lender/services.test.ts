import { afterEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../../mocks/server'
import { getLenders, getLender, createLender, deleteLender } from '../../../src/modules/lender/services'

afterEach(() => server.resetHandlers())

describe('lender services', () => {
  it('getLenders forwards filter params as a query string', async () => {
    let receivedParams: URLSearchParams | null = null
    server.use(
      http.get('*/admin/lenders', ({ request }) => {
        receivedParams = new URL(request.url).searchParams
        return HttpResponse.json({ status: true, data: [] })
      })
    )
    await getLenders({ search: 'chase' } as any)
    expect(receivedParams!.get('search')).toBe('chase')
  })

  it('getLender fetches a single lender by id', async () => {
    server.use(http.get('*/admin/lenders/7', () => HttpResponse.json({ status: true, data: { id: 7 } })))
    await expect(getLender(7)).resolves.toEqual({ status: true, data: { id: 7 } })
  })

  it('createLender posts the payload', async () => {
    let receivedBody: unknown = null
    server.use(
      http.post('*/admin/lenders', async ({ request }) => {
        receivedBody = await request.json()
        return HttpResponse.json({ status: true, data: { id: 1 } })
      })
    )
    await createLender({ name: 'Chase' } as any)
    expect(receivedBody).toEqual({ name: 'Chase' })
  })

  it('deleteLender DELETEs by id', async () => {
    server.use(http.delete('*/admin/lenders/3', () => HttpResponse.json({ status: true, message: 'Deleted' })))
    await expect(deleteLender(3)).resolves.toEqual({ status: true, message: 'Deleted' })
  })
})
