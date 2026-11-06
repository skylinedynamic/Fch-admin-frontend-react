import { afterEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../../mocks/server'
import {
  getActivityLogs,
  getActivityLog,
  createActivityLog,
  downloadActivityAttachment,
  updateActivityLogVisibility,
  getActivityEmailSender,
} from '../../../src/modules/activity-log/services'

afterEach(() => server.resetHandlers())

describe('getActivityLogs', () => {
  it('POSTs the given params and resolves with the raw response payload', async () => {
    let receivedBody: any = null
    server.use(
      http.post('*/common/activity-logs/fetch-all-activities', async ({ request }) => {
        receivedBody = await request.json()
        return HttpResponse.json({
          status: true,
          message: 'ok',
          data: [{ id: 1, log_type: 'note', subject: 'Test', description: 'desc', created_at: '', updated_at: '' }],
          meta: { current_page: 1, total: 1 },
        })
      })
    )

    const result = await getActivityLogs({ borrower_id: 42, page: 1 })

    expect(receivedBody).toEqual({ borrower_id: 42, page: 1 })
    // Note: the service returns response.data as-is (the full envelope),
    // it does not unwrap to just the `data` array.
    expect(result.status).toBe(true)
    expect(result.data).toHaveLength(1)
    expect(result.meta.total).toBe(1)
  })

  it('defaults params to {} when none are provided', async () => {
    let receivedBody: any = null
    server.use(
      http.post('*/common/activity-logs/fetch-all-activities', async ({ request }) => {
        receivedBody = await request.json()
        return HttpResponse.json({ status: true, message: 'ok', data: [] })
      })
    )

    await getActivityLogs()
    expect(receivedBody).toEqual({})
  })
})

describe('getActivityLog', () => {
  it('GETs the log by id and resolves with the raw response envelope (not unwrapped to .data)', async () => {
    server.use(
      http.get('*/common/activity-logs/7', () =>
        HttpResponse.json({
          status: true,
          message: 'Details retrieved',
          data: { id: 7, log_type: 'note', subject: 'Hi', description: 'desc', created_at: '', updated_at: '' },
        })
      )
    )

    const result = await getActivityLog(7)
    // The function's declared return type is Promise<ActivityLog>, but it
    // actually returns response.data — the full {status, message, data}
    // envelope — without unwrapping. Callers relying on the declared type
    // would get the envelope instead of the ActivityLog fields directly.
    expect((result as any).status).toBe(true)
    expect((result as any).data.id).toBe(7)
  })
})

describe('createActivityLog', () => {
  it('POSTs the given payload to /common/activity-logs', async () => {
    let receivedBody: any = null
    server.use(
      http.post('*/common/activity-logs', async ({ request }) => {
        receivedBody = await request.json()
        return HttpResponse.json({ status: true, message: 'Created', data: { id: 99 } }, { status: 201 })
      })
    )

    const result = await createActivityLog({ log_type: 'note', subject: 'Hi', description: 'desc' })
    expect(receivedBody).toEqual({ log_type: 'note', subject: 'Hi', description: 'desc' })
    expect(result.data.id).toBe(99)
  })
})

describe('updateActivityLogVisibility', () => {
  it('PATCHes the visibility endpoint with the given level', async () => {
    let receivedBody: any = null
    let receivedMethod = ''
    server.use(
      http.patch('*/common/activity-logs/12/visibility', async ({ request }) => {
        receivedMethod = request.method
        receivedBody = await request.json()
        return HttpResponse.json({
          status: true,
          message: 'Activity visibility updated successfully.',
          data: { id: 12, visibility: 'everyone', visibility_label: 'Everyone (Including Borrower)' },
        })
      })
    )

    const result = await updateActivityLogVisibility(12, 'everyone')

    expect(receivedMethod).toBe('PATCH')
    expect(receivedBody).toEqual({ visibility: 'everyone' })
    expect(result.data.visibility).toBe('everyone')
  })

  it('accepts a string id and builds the URL from it', async () => {
    let hitUrl = ''
    server.use(
      http.patch('*/common/activity-logs/:id/visibility', ({ request, params }) => {
        hitUrl = String(params.id)
        return HttpResponse.json({ status: true, message: 'ok', data: { id: request.url } })
      })
    )

    await updateActivityLogVisibility('12', 'private')
    expect(hitUrl).toBe('12')
  })
})

describe('downloadActivityAttachment', () => {
  it('POSTs activity_log_id/path and resolves with the blob response body', async () => {
    let receivedBody: any = null
    const blobContent = 'file-bytes'
    server.use(
      http.post('*/common/activity-logs/attachments/download', async ({ request }) => {
        receivedBody = await request.json()
        return new HttpResponse(blobContent, { headers: { 'Content-Type': 'application/octet-stream' } })
      })
    )

    const result = await downloadActivityAttachment({ activity_log_id: 5, path: 'attachments/file.pdf' })

    expect(receivedBody).toEqual({ activity_log_id: 5, path: 'attachments/file.pdf' })
    expect(result).toBeInstanceOf(Blob)
    expect(await (result as Blob).text()).toBe(blobContent)
  })
})

describe('getActivityEmailSender', () => {
  const senders = {
    default: 'partner',
    options: {
      partner: { partner_id: 7, name: 'Acme Capital', address: 'mail@acme.test', uses_fallback: false },
      host: { partner_id: 1, name: 'Four Corner Funding', address: 'noreply@fcf.test', uses_fallback: true },
    },
  }

  it("GETs the host's two sending choices for the record's partner and resolves with them", async () => {
    let url: URL | null = null
    server.use(
      http.get('*/common/activity-logs/email-sender', ({ request }) => {
        url = new URL(request.url)
        return HttpResponse.json({ status: true, message: 'ok', data: senders })
      })
    )

    expect(await getActivityEmailSender(7)).toEqual(senders)
    expect(url!.searchParams.get('partner_id')).toBe('7')
  })

  it('sends no partner_id for a host record', async () => {
    let url: URL | null = null
    server.use(
      http.get('*/common/activity-logs/email-sender', ({ request }) => {
        url = new URL(request.url)
        return HttpResponse.json({ status: true, message: 'ok', data: { default: 'host', options: { partner: null, host: senders.options.host } } })
      })
    )

    expect((await getActivityEmailSender(null)).options.partner).toBeNull()
    expect(url!.searchParams.has('partner_id')).toBe(false)
  })
})
