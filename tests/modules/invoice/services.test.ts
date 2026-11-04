import { afterEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../../mocks/server'
import {
  fetchInvoices,
  fetchInvoiceDetails,
  processUnifiedPayment,
  confirmAuthenticatedPayment,
  downloadInvoice,
  sendInvoice,
} from '../../../src/modules/invoice/services'

afterEach(() => server.resetHandlers())

describe('invoice services', () => {
  it('fetchInvoices posts the filter params', async () => {
    let receivedBody: unknown = null
    server.use(
      http.post('*/common/invoices/fetch-invoices', async ({ request }) => {
        receivedBody = await request.json()
        return HttpResponse.json({ status: true, data: [] })
      })
    )
    await fetchInvoices({ search: 'acme' } as any)
    expect(receivedBody).toEqual({ search: 'acme' })
  })

  it('fetchInvoiceDetails fetches by id', async () => {
    server.use(
      http.get('*/common/invoices/42', () => HttpResponse.json({ status: true, data: { id: 42 } }))
    )
    await expect(fetchInvoiceDetails(42)).resolves.toEqual({ status: true, data: { id: 42 } })
  })

  it('processUnifiedPayment posts only the Stripe payment method id — never raw card data', async () => {
    let receivedBody: any = null
    server.use(
      http.post('*/payment/process', async ({ request }) => {
        receivedBody = await request.json()
        return HttpResponse.json({ status: true, data: { id: 1 } })
      })
    )
    await processUnifiedPayment({ payment_token: 'pm_abc123', invoice_id: 7, payment_method_id: 2 })
    expect(receivedBody).toEqual({ payment_token: 'pm_abc123', invoice_id: 7, payment_method_id: 2 })
    expect(receivedBody).not.toHaveProperty('cardNumber')
    expect(receivedBody).not.toHaveProperty('cvv')
  })

  it('downloadInvoice and sendInvoice hit the id-scoped routes', async () => {
    server.use(
      http.get('*/common/invoices/5/download', () => HttpResponse.json({ status: true })),
      http.post('*/common/invoices/5/send', () => HttpResponse.json({ status: true, message: 'Sent' }))
    )
    await expect(downloadInvoice(5)).resolves.toEqual({ status: true })
    await expect(sendInvoice(5)).resolves.toEqual({ status: true, message: 'Sent' })
  })

  it('confirmAuthenticatedPayment posts only the payment id after the 3-D Secure challenge', async () => {
    let receivedBody: unknown = null
    server.use(
      http.post('*/payment/confirm', async ({ request }) => {
        receivedBody = await request.json()
        return HttpResponse.json({ status: true, message: 'Payment processed successfully.', data: { success: true, payment_id: 7, status: 'succeeded' } })
      })
    )

    const result = await confirmAuthenticatedPayment(7)

    expect(receivedBody).toEqual({ payment_id: 7 })
    expect(result.data?.status).toBe('succeeded')
  })
})
