import { afterEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../../mocks/server'
import {
  getEmbedFormConfig,
  updateEmbedFormConfig,
  regenerateEmbedKey,
  fetchEmbedFormSubmissions,
  getEmbedFormSubmission,
  updateEmbedFormSubmissionStatus,
  downloadEmbedFormAttachment,
  convertEmbedFormSubmissionToBorrower,
} from '../../../src/modules/embed-form/services'

afterEach(() => server.resetHandlers())

describe('getEmbedFormConfig', () => {
  it('sends partner_id as a query param when provided', async () => {
    let receivedUrl: URL | null = null
    server.use(
      http.get('*/common/embed-forms/config', ({ request }) => {
        receivedUrl = new URL(request.url)
        return HttpResponse.json({ status: true, message: 'ok', data: { form_title: 'Apply' } })
      })
    )

    await getEmbedFormConfig(5)
    expect(receivedUrl!.searchParams.get('partner_id')).toBe('5')
  })

  it('omits partner_id from the query when not provided', async () => {
    let receivedUrl: URL | null = null
    server.use(
      http.get('*/common/embed-forms/config', ({ request }) => {
        receivedUrl = new URL(request.url)
        return HttpResponse.json({ status: true, message: 'ok', data: {} })
      })
    )

    await getEmbedFormConfig()
    expect(receivedUrl!.searchParams.has('partner_id')).toBe(false)
  })
})

describe('updateEmbedFormConfig', () => {
  it('PUTs the config payload and returns the response body', async () => {
    let receivedBody: any = null
    server.use(
      http.put('*/common/embed-forms/config', async ({ request }) => {
        receivedBody = await request.json()
        return HttpResponse.json({ status: true, message: 'updated', data: {} })
      })
    )

    const payload = { form_title: 'New Title', is_active: true }
    await updateEmbedFormConfig(payload)
    expect(receivedBody).toEqual(payload)
  })
})

describe('regenerateEmbedKey', () => {
  it('POSTs to the generate-key endpoint', async () => {
    server.use(
      http.post('*/common/embed-forms/config/generate-key', () =>
        HttpResponse.json({ status: true, message: 'ok', data: { embed_key: 'new-key' } })
      )
    )

    const result = await regenerateEmbedKey()
    expect(result.data.embed_key).toBe('new-key')
  })
})

describe('fetchEmbedFormSubmissions', () => {
  it('POSTs the filter payload and returns the response body', async () => {
    let receivedBody: any = null
    server.use(
      http.post('*/common/embed-forms/submissions/fetch', async ({ request }) => {
        receivedBody = await request.json()
        return HttpResponse.json({ status: true, message: 'ok', data: [] })
      })
    )

    await fetchEmbedFormSubmissions({ status: 'pending' })
    expect(receivedBody).toEqual({ status: 'pending' })
  })

  it('defaults the payload to {} when called with no arguments', async () => {
    let receivedBody: any = null
    server.use(
      http.post('*/common/embed-forms/submissions/fetch', async ({ request }) => {
        receivedBody = await request.json()
        return HttpResponse.json({ status: true, message: 'ok', data: [] })
      })
    )

    await fetchEmbedFormSubmissions()
    expect(receivedBody).toEqual({})
  })
})

describe('getEmbedFormSubmission', () => {
  it('GETs a submission by id', async () => {
    server.use(
      http.get('*/common/embed-forms/submissions/3', () =>
        HttpResponse.json({ status: true, message: 'ok', data: { id: 3 } })
      )
    )

    const result = await getEmbedFormSubmission(3)
    expect(result.data.id).toBe(3)
  })
})

describe('updateEmbedFormSubmissionStatus', () => {
  it('PUTs the status in the request body', async () => {
    let receivedBody: any = null
    server.use(
      http.put('*/common/embed-forms/submissions/3/status', async ({ request }) => {
        receivedBody = await request.json()
        return HttpResponse.json({ status: true, message: 'ok', data: { id: 3, status: 'approved' } })
      })
    )

    await updateEmbedFormSubmissionStatus(3, 'approved')
    expect(receivedBody).toEqual({ status: 'approved' })
  })
})

describe('downloadEmbedFormAttachment', () => {
  it('requests the attachment as a blob and returns the full axios response', async () => {
    server.use(
      http.get('*/common/embed-forms/attachments/8/download', () => new HttpResponse('bytes', { status: 200 }))
    )

    const response = await downloadEmbedFormAttachment(8)
    expect(response.status).toBe(200)
  })
})

describe('convertEmbedFormSubmissionToBorrower', () => {
  it('POSTs the conversion payload to the submission id endpoint', async () => {
    let receivedBody: any = null
    server.use(
      http.post('*/common/embed-forms/submissions/3/convert-to-borrower', async ({ request }) => {
        receivedBody = await request.json()
        return HttpResponse.json({ status: true, message: 'converted', data: { borrower_id: 99 } })
      })
    )

    await convertEmbedFormSubmissionToBorrower(3, { notify: true })
    expect(receivedBody).toEqual({ notify: true })
  })

  it('defaults the payload to {} when not provided', async () => {
    let receivedBody: any = null
    server.use(
      http.post('*/common/embed-forms/submissions/3/convert-to-borrower', async ({ request }) => {
        receivedBody = await request.json()
        return HttpResponse.json({ status: true, message: 'converted', data: {} })
      })
    )

    await convertEmbedFormSubmissionToBorrower(3)
    expect(receivedBody).toEqual({})
  })
})
