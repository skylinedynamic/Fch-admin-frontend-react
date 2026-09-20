import { afterEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../../mocks/server'
import {
  fetchContacts,
  fetchContactById,
  createContact,
  updateContact,
  deleteContact,
  deleteContacts,
  fetchReferralPartners,
} from '../../../src/modules/contact/services'

afterEach(() => server.resetHandlers())

describe('fetchContacts', () => {
  it('POSTs filter params and returns the envelope as-is (list stays wrapped)', async () => {
    let receivedBody: unknown = null
    server.use(
      http.post('*/common/contacts/fetch-contacts', async ({ request }) => {
        receivedBody = await request.json()
        return HttpResponse.json({
          status: true,
          message: 'ok',
          data: [{ full_name: 'Jo Doe', first_name: 'Jo', last_name: 'Doe', mobile_number: '123', email: 'jo@x.com' }],
          meta: { current_page: 1, last_page: 1, from: 1, to: 1, per_page: 10, total: 1 },
        })
      })
    )

    const result = await fetchContacts({ search: 'Jo' })
    expect(receivedBody).toEqual({ search: 'Jo' })
    expect(result.data).toHaveLength(1)
    expect(result.status).toBe(true)
  })
})

describe('fetchContactById', () => {
  it('GETs by id and unwraps the response envelope (returns .data.data)', async () => {
    server.use(
      http.get('*/common/contacts/8', () =>
        HttpResponse.json({
          status: true,
          message: 'ok',
          data: { id: 8, full_name: 'Ann Lee', first_name: 'Ann', last_name: 'Lee', mobile_number: '555', email: 'ann@x.com' },
        })
      )
    )

    const contact = await fetchContactById(8)
    // fetchContactById returns data.data, not the raw envelope
    expect(contact).toEqual({ id: 8, full_name: 'Ann Lee', first_name: 'Ann', last_name: 'Lee', mobile_number: '555', email: 'ann@x.com' })
  })
})

describe('createContact / updateContact', () => {
  it('createContact POSTs the payload to the collection endpoint', async () => {
    server.use(
      http.post('*/common/contacts', () =>
        HttpResponse.json({ status: true, message: 'created', data: { id: 1, full_name: 'New', first_name: 'New', last_name: '', mobile_number: '1', email: 'n@x.com' } })
      )
    )

    const result = await createContact({ full_name: 'New', first_name: 'New', last_name: '', mobile_number: '1', email: 'n@x.com' })
    expect(result.data.id).toBe(1)
  })

  it('updateContact PUTs the payload to the id-scoped endpoint', async () => {
    let method = ''
    server.use(
      http.put('*/common/contacts/2', ({ request }) => {
        method = request.method
        return HttpResponse.json({ status: true, message: 'updated', data: { id: 2, full_name: 'Upd', first_name: 'Upd', last_name: '', mobile_number: '1', email: 'u@x.com' } })
      })
    )

    const result = await updateContact(2, { full_name: 'Upd' })
    expect(method).toBe('PUT')
    expect(result.data.full_name).toBe('Upd')
  })
})

describe('deleteContact / deleteContacts', () => {
  it('deleteContact DELETEs the id-scoped endpoint', async () => {
    server.use(http.delete('*/common/contacts/3', () => HttpResponse.json({ status: true, message: 'deleted' })))
    const result = await deleteContact(3)
    expect(result).toEqual({ status: true, message: 'deleted' })
  })

  it('deleteContacts POSTs the id array to the multiple-delete endpoint', async () => {
    let receivedBody: unknown = null
    server.use(
      http.post('*/common/contacts/multiple-delete', async ({ request }) => {
        receivedBody = await request.json()
        return HttpResponse.json({ status: true, message: 'deleted' })
      })
    )

    await deleteContacts([1, 2, 3])
    expect(receivedBody).toEqual({ ids: [1, 2, 3] })
  })
})

describe('fetchReferralPartners', () => {
  it('POSTs a fixed referral-partner filter and returns the data array', async () => {
    let receivedBody: unknown = null
    server.use(
      http.post('*/common/contacts/fetch-contacts', async ({ request }) => {
        receivedBody = await request.json()
        return HttpResponse.json({
          status: true,
          message: 'ok',
          data: [{ full_name: 'Partner A', first_name: 'Partner', last_name: 'A', mobile_number: '1', email: 'p@x.com' }],
        })
      })
    )

    const result = await fetchReferralPartners()
    expect(receivedBody).toEqual({
      per_page: 1000,
      filters: { is_referral_partner: { value: 1, matchMode: 'equals' } },
    })
    expect(result).toHaveLength(1)
  })

  it('falls back to an empty array when the backend omits data', async () => {
    server.use(
      http.post('*/common/contacts/fetch-contacts', () => HttpResponse.json({ status: true, message: 'ok' }))
    )

    const result = await fetchReferralPartners()
    expect(result).toEqual([])
  })
})
