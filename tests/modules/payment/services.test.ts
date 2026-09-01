import { afterEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../../mocks/server'
import { fetchPayments, fetchPaymentById, approvePayment, rejectPayment } from '../../../src/modules/payment/services'

afterEach(() => server.resetHandlers())

describe('payment services', () => {
  it('fetchPayments posts the filter params to fetch-payments and returns the raw body', async () => {
    let receivedBody: unknown = null
    server.use(
      http.post('*/common/payments/fetch-payments', async ({ request }) => {
        receivedBody = await request.json()
        return HttpResponse.json({ status: true, data: [{ id: 1 }] })
      })
    )
    await expect(fetchPayments({ status: 'pending', page: 2 })).resolves.toEqual({
      status: true,
      data: [{ id: 1 }],
    })
    expect(receivedBody).toEqual({ status: 'pending', page: 2 })
  })

  it('fetchPayments defaults to an empty params object when none is passed', async () => {
    let receivedBody: unknown = null
    server.use(
      http.post('*/common/payments/fetch-payments', async ({ request }) => {
        receivedBody = await request.json()
        return HttpResponse.json({ status: true, data: [] })
      })
    )
    await fetchPayments()
    expect(receivedBody).toEqual({})
  })

  it('fetchPaymentById gets the id-scoped route and returns the raw body', async () => {
    let calledPath = ''
    server.use(
      http.get('*/common/payments/:id', ({ request, params }) => {
        calledPath = new URL(request.url).pathname
        expect(params.id).toBe('42')
        return HttpResponse.json({ id: 42, status: 'completed' })
      })
    )
    await expect(fetchPaymentById(42)).resolves.toEqual({ id: 42, status: 'completed' })
    expect(calledPath.endsWith('/common/payments/42')).toBe(true)
  })

  it('approvePayment posts the note to the id-scoped approve route', async () => {
    let calledPath = ''
    let receivedBody: unknown = null
    server.use(
      http.post('*/common/payments/:id/approve', async ({ request }) => {
        calledPath = new URL(request.url).pathname
        receivedBody = await request.json()
        return HttpResponse.json({ status: true, message: 'Approved' })
      })
    )
    await approvePayment(8, { note: 'Looks good' })
    expect(calledPath.endsWith('/common/payments/8/approve')).toBe(true)
    expect(receivedBody).toEqual({ note: 'Looks good' })
  })

  it('rejectPayment posts the reason (and optional note) to the id-scoped reject route', async () => {
    let calledPath = ''
    let receivedBody: unknown = null
    server.use(
      http.post('*/common/payments/:id/reject', async ({ request }) => {
        calledPath = new URL(request.url).pathname
        receivedBody = await request.json()
        return HttpResponse.json({ status: true, message: 'Rejected' })
      })
    )
    await rejectPayment(8, { reason: 'Insufficient documentation', note: 'See ticket #5' })
    expect(calledPath.endsWith('/common/payments/8/reject')).toBe(true)
    expect(receivedBody).toEqual({ reason: 'Insufficient documentation', note: 'See ticket #5' })
  })
})
