import { afterEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../../mocks/server'
import { fetchBorrowerById, fetchAllBorrowers, createBorrower, deleteBorrower } from '../../../src/modules/borrower/services'

afterEach(() => server.resetHandlers())

describe('borrower services', () => {
  it('fetchBorrowerById fetches by id', async () => {
    server.use(http.get('*/borrowers/12', () => HttpResponse.json({ id: 12, name: 'Jane' })))
    await expect(fetchBorrowerById(12)).resolves.toEqual({ id: 12, name: 'Jane' })
  })

  it('fetchAllBorrowers posts the filter payload, defaulting to {}', async () => {
    let receivedBody: unknown = null
    server.use(
      http.post('*/common/borrowers/fetch-all-borrowers', async ({ request }) => {
        receivedBody = await request.json()
        return HttpResponse.json({ status: true, data: [] })
      })
    )
    await fetchAllBorrowers()
    expect(receivedBody).toEqual({})
  })

  it('createBorrower posts the payload', async () => {
    let receivedBody: unknown = null
    server.use(
      http.post('*/borrowers', async ({ request }) => {
        receivedBody = await request.json()
        return HttpResponse.json({ id: 1, name: 'New Borrower' })
      })
    )
    await createBorrower({ name: 'New Borrower' } as any)
    expect(receivedBody).toEqual({ name: 'New Borrower' })
  })

  it('deleteBorrower DELETEs by id', async () => {
    let called = false
    server.use(http.delete('*/borrowers/3', () => { called = true; return new HttpResponse(null, { status: 204 }) }))
    await deleteBorrower(3)
    expect(called).toBe(true)
  })
})
