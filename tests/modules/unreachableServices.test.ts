import { afterEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../mocks/server'
import { uploadPartnerDocument } from '../../src/modules/partner/services'
import { fetchThemeConfigurations } from '../../src/modules/settings/services'
import { fetchTimeSlots } from '../../src/modules/appointment/services'
import { processInvoicePayment, initiateSubscriptionPayment } from '../../src/modules/invoice/services'
import { processPayment } from '../../src/modules/leads/services'
import { purchaseUserSeats } from '../../src/modules/user/services'
import { fetchAllClients } from '../../src/modules/client/services'
import { updateFundingSequencingVisibility } from '../../src/modules/funding/services'
import { attachFiles } from '../../src/modules/filemanager/services'
import { fetchClients } from '../../src/modules/client/services'
import { getTierTask } from '../../src/modules/tiers/services'
import { fetchPartnerStats } from '../../src/modules/partner/services'

/**
 * Service functions that no screen calls today, so no e2e test can reach them
 * (the api-coverage audit lists them as unreachable). These pin the request
 * each one would send, so a screen that starts using one gets a known contract.
 *
 *   uploadPartnerDocument          - DocumentsSection attaches from the file manager instead
 *   fetchThemeConfigurations       - the sign-in screen moved to /common/branding
 *   fetchTimeSlots                 - the appointment dialog builds its own slots
 *   processInvoicePayment          - invoices pay through /payment/process
 *   initiateSubscriptionPayment    - not wired to any button
 *   processPayment (leads)         - LeadPaymentModal is rendered but never opened
 *   purchaseUserSeats              - seats are bought by paying the seat invoice
 *   fetchAllClients                - the client list uses fetch-all-borrowers
 *   updateFundingSequencingVisibility - its branch is behind a hidden button
 *   attachFiles                    - file selection posts to each entity's own endpoint
 *   fetchClients                   - useClients calls fetchAllBorrowers instead
 *   getTierTask                    - the tier task form edits the row it was given
 *   fetchPartnerStats              - imported by Partners.jsx but never called
 */

afterEach(() => server.resetHandlers())

type Seen = { method: string; path: string; body: unknown; contentType: string | null }

function capture(method: 'get' | 'post' | 'put', path: string, response: unknown = { status: true, data: [] }) {
  const seen: Seen[] = []
  server.use(
    http[method](`*${path}`, async ({ request }) => {
      const contentType = request.headers.get('content-type')
      let body: unknown = null
      if (method !== 'get') {
        body = contentType?.includes('multipart') ? await request.formData() : await request.json().catch(() => null)
      }
      seen.push({ method: request.method, path: new URL(request.url).pathname, body, contentType })
      return HttpResponse.json(response as Record<string, unknown>)
    }),
  )
  return seen
}

describe('unreachable service functions', () => {
  it('uploadPartnerDocument posts the form data as multipart', async () => {
    const seen = capture('post', '/admin/partners/documents')
    const form = new FormData()
    form.append('partner_id', '5')
    await uploadPartnerDocument(5, form)
    expect(seen).toHaveLength(1)
    expect(seen[0].contentType).toContain('multipart/form-data')
    expect((seen[0].body as FormData).get('partner_id')).toBe('5')
  })

  it('fetchThemeConfigurations reads /common/get-theme', async () => {
    const seen = capture('get', '/common/get-theme', { status: true, data: { theme: 'light' } })
    await expect(fetchThemeConfigurations()).resolves.toEqual({ status: true, data: { theme: 'light' } })
    expect(seen[0].path).toMatch(/\/common\/get-theme$/)
  })

  it('fetchTimeSlots reads /common/time-slots/fetch-all', async () => {
    const seen = capture('get', '/common/time-slots/fetch-all', { status: true, data: ['09:00'] })
    await expect(fetchTimeSlots()).resolves.toEqual({ status: true, data: ['09:00'] })
    expect(seen).toHaveLength(1)
  })

  it('processInvoicePayment posts the payload to /process-payment', async () => {
    const seen = capture('post', '/process-payment')
    await processInvoicePayment({ invoice_id: 1001, payment_token: 'tok' })
    expect(seen[0].body).toEqual({ invoice_id: 1001, payment_token: 'tok' })
  })

  it('initiateSubscriptionPayment posts the invoice id', async () => {
    const seen = capture('post', '/payment/initiate-subscription', { status: true, data: { url: 'https://pay.test' } })
    await expect(initiateSubscriptionPayment({ invoice_id: 7 })).resolves.toMatchObject({ data: { url: 'https://pay.test' } })
    expect(seen[0].body).toEqual({ invoice_id: 7 })
  })

  it('processPayment (leads) posts the payload to /process-payment', async () => {
    const seen = capture('post', '/process-payment')
    await processPayment({ lead_id: 51, amount: 100 })
    expect(seen[0].body).toEqual({ lead_id: 51, amount: 100 })
  })

  it('purchaseUserSeats posts the payload to /process-payment-for-users', async () => {
    const seen = capture('post', '/process-payment-for-users')
    await purchaseUserSeats({ quantity: 2, months: 1 })
    expect(seen[0].body).toEqual({ quantity: 2, months: 1 })
  })

  it('fetchAllClients reads /common/borrowers/all', async () => {
    const seen = capture('get', '/common/borrowers/all', { status: true, data: [{ id: 1 }] })
    await expect(fetchAllClients()).resolves.toEqual({ status: true, data: [{ id: 1 }] })
    expect(seen).toHaveLength(1)
  })

  it('updateFundingSequencingVisibility PUTs every rule of the sequence', async () => {
    const seen = capture('put', '/admin/funding-sequencings/201/visibility')
    await updateFundingSequencingVisibility(201, { lender_visibilities: [] } as never)
    expect(seen[0].method).toBe('PUT')
    expect(seen[0].body).toEqual({ lender_visibilities: [] })
  })

  it('attachFiles posts the files and the document type', async () => {
    const seen = capture('post', '/filemanager/upload-file')
    await attachFiles(['/w9.pdf'], 3)
    expect(seen[0].body).toEqual({ files: ['/w9.pdf'], document_type_id: 3 })
  })

  it('fetchClients posts the filters to /common/borrowers/fetch-borrowers', async () => {
    const seen = capture('post', '/common/borrowers/fetch-borrowers')
    await fetchClients({ page: 2 } as never)
    expect(seen[0].body).toEqual({ page: 2 })
  })

  it('getTierTask reads one tier task', async () => {
    const seen = capture('get', '/admin/credit-builder/tier-tasks/14', { status: true, data: { id: 14 } })
    await getTierTask(14)
    expect(seen).toHaveLength(1)
  })

  it('fetchPartnerStats posts to /admin/partners-stats', async () => {
    const seen = capture('post', '/admin/partners-stats', { status: true, data: { total: 3 } })
    await fetchPartnerStats()
    expect(seen).toHaveLength(1)
  })

  it('a failed request rejects', async () => {
    server.use(http.get('*/common/borrowers/all', () => HttpResponse.json({ status: false, message: 'boom' }, { status: 500 })))
    await expect(fetchAllClients()).rejects.toBeTruthy()
  })
})
