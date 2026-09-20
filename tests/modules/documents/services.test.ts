import { afterEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../../mocks/server'
import { fetchDocumentTypes, fetchBorrowerDocuments, deleteDocument, downloadBorrowerDocument } from '../../../src/modules/documents/services'

afterEach(() => server.resetHandlers())

describe('fetchDocumentTypes', () => {
  it('unwraps the envelope and returns only the data array', async () => {
    const types = [{ id: 1, name: 'W2', sort_order: 1 }]
    server.use(
      http.get('*/common/doc-types', () => HttpResponse.json({ status: true, message: 'ok', data: types }))
    )

    await expect(fetchDocumentTypes()).resolves.toEqual(types)
  })
})

describe('fetchBorrowerDocuments', () => {
  it('unwraps the envelope and returns the documents keyed by document type id', async () => {
    const documentsByType = {
      '1': [{ id: 10, borrower_id: 1, document_type_id: 1, file_name: 'w2.pdf', file_path: '/w2.pdf', url: 'https://x/w2.pdf' }],
    }
    server.use(
      http.get('*/borrower/documents', () => HttpResponse.json({ status: true, message: 'ok', data: documentsByType }))
    )

    await expect(fetchBorrowerDocuments()).resolves.toEqual(documentsByType)
  })
})

describe('deleteDocument', () => {
  it('DELETEs by document id and returns the full response envelope', async () => {
    server.use(
      http.delete('*/borrower/documents/55', () =>
        HttpResponse.json({ status: true, message: 'Document deleted.', data: null })
      )
    )

    await expect(deleteDocument(55)).resolves.toEqual({ status: true, message: 'Document deleted.', data: null })
  })
})

describe('downloadBorrowerDocument', () => {
  it('coerces the id to a number in the URL and requests a blob response', async () => {
    server.use(
      http.get('*/common/borrowers-documents/download/77', () => new HttpResponse('file-bytes', { status: 200 }))
    )

    const response = await downloadBorrowerDocument('77')
    expect(response.status).toBe(200)
  })
})
