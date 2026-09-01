import { afterEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../../mocks/server'
import { attachBorrowerDocuments, updateBorrowerDocumentStatus, fetchClientById } from '../../../src/modules/client/services'

afterEach(() => server.resetHandlers())

describe('client services', () => {
  it('fetchClientById fetches by id', async () => {
    server.use(http.get('*/common/borrowers/12', () => HttpResponse.json({ id: 12, name: 'Jane' })))
    await expect(fetchClientById(12)).resolves.toEqual({ id: 12, name: 'Jane' })
  })

  it('attachBorrowerDocuments coerces ids to numbers and defaults entity_type to "borrowers"', async () => {
    let receivedBody: any = null
    server.use(
      http.post('*/common/borrowers-documents/upload', async ({ request }) => {
        receivedBody = await request.json()
        return HttpResponse.json({ status: true, message: 'Uploaded' })
      })
    )
    await attachBorrowerDocuments({ borrower_id: '5', file_path: '/docs/a.pdf' })
    expect(receivedBody.borrower_id).toBe(5)
    expect(receivedBody.entity_id).toBe(5)
    expect(receivedBody.entity_type).toBe('borrowers')
  })

  it('updateBorrowerDocumentStatus posts status and maps note to rejection_reason', async () => {
    let receivedBody: unknown = null
    server.use(
      http.post('*/common/borrowers-documents/update-status/8', async ({ request }) => {
        receivedBody = await request.json()
        return HttpResponse.json({ status: true, message: 'Updated' })
      })
    )
    await updateBorrowerDocumentStatus(8, 'Rejected', 'Illegible scan')
    expect(receivedBody).toEqual({ status: 'Rejected', rejection_reason: 'Illegible scan' })
  })
})
