import { afterEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../../mocks/server'
import {
  fetchCapitalAccounts,
  getCapitalAccount,
  createCapitalAccount,
  updateCapitalAccount,
  deleteCapitalAccount,
  updateCapitalAccountStatus,
  fetchAllCreditAccountsForBuilder,
} from '../../../src/modules/capital-access/services'

afterEach(() => server.resetHandlers())

describe('fetchCapitalAccounts', () => {
  it('POSTs the payload as-is and returns the list envelope', async () => {
    let receivedBody: unknown = null
    server.use(
      http.post('*/common/capital-accesses/fetch-all', async ({ request }) => {
        receivedBody = await request.json()
        return HttpResponse.json({
          status: true,
          message: 'ok',
          data: [{ id: 1, name: 'Program A', status: 'active' }],
          meta: { current_page: 1, last_page: 1, per_page: 10, total: 1 },
        })
      })
    )

    const result = await fetchCapitalAccounts({ page: 1, per_page: 10 })
    expect(receivedBody).toEqual({ page: 1, per_page: 10 })
    expect(result.data).toEqual([{ id: 1, name: 'Program A', status: 'active' }])
    expect(result.meta?.total).toBe(1)
  })

  it('defaults the payload to {} when none is given', async () => {
    let receivedBody: unknown = 'not-set'
    server.use(
      http.post('*/common/capital-accesses/fetch-all', async ({ request }) => {
        receivedBody = await request.json()
        return HttpResponse.json({ status: true, message: 'ok', data: [] })
      })
    )

    await fetchCapitalAccounts()
    expect(receivedBody).toEqual({})
  })
})

describe('getCapitalAccount', () => {
  it('GETs by id and returns the single-item envelope', async () => {
    server.use(
      http.get('*/common/capital-accesses/5', () =>
        HttpResponse.json({ status: true, message: 'ok', data: { id: 5, name: 'Program B', status: 'draft' } })
      )
    )

    const result = await getCapitalAccount(5)
    expect(result.data).toEqual({ id: 5, name: 'Program B', status: 'draft' })
  })
})

describe('createCapitalAccount / updateCapitalAccount / deleteCapitalAccount', () => {
  it('createCapitalAccount POSTs the payload to the collection endpoint', async () => {
    let receivedBody: unknown = null
    server.use(
      http.post('*/common/capital-accesses', async ({ request }) => {
        receivedBody = await request.json()
        return HttpResponse.json({ status: true, message: 'created', data: { id: 10, name: 'New', status: 'draft' } })
      })
    )

    const payload = {
      name: 'New',
      sub_title: 'Sub',
      target_exposure_min: 1000,
      target_exposure_max: 5000,
      est_timeline_min: 1,
      est_timeline_max: 3,
      what_you_will_get: [],
      pre_flight_checklist: [],
    }
    const result = await createCapitalAccount(payload)
    expect(receivedBody).toEqual(payload)
    expect(result.data.id).toBe(10)
  })

  it('updateCapitalAccount PUTs the payload to the id-scoped endpoint', async () => {
    let method = ''
    server.use(
      http.put('*/common/capital-accesses/7', async ({ request }) => {
        method = request.method
        return HttpResponse.json({ status: true, message: 'updated', data: { id: 7, name: 'Updated', status: 'active' } })
      })
    )

    const result = await updateCapitalAccount(7, {
      name: 'Updated',
      sub_title: '',
      target_exposure_min: 0,
      target_exposure_max: 0,
      est_timeline_min: 0,
      est_timeline_max: 0,
      what_you_will_get: [],
      pre_flight_checklist: [],
    })
    expect(method).toBe('PUT')
    expect(result.data.name).toBe('Updated')
  })

  it('deleteCapitalAccount DELETEs the id-scoped endpoint', async () => {
    server.use(
      http.delete('*/common/capital-accesses/3', () => HttpResponse.json({ status: true, message: 'deleted' }))
    )

    const result = await deleteCapitalAccount(3)
    expect(result).toEqual({ status: true, message: 'deleted' })
  })
})

describe('updateCapitalAccountStatus', () => {
  it('PATCHes just the status field to the status sub-resource', async () => {
    let receivedBody: unknown = null
    server.use(
      http.patch('*/common/capital-accesses/4/status', async ({ request }) => {
        receivedBody = await request.json()
        return HttpResponse.json({ status: true, message: 'ok', data: { id: 4, name: 'X', status: 'inactive' } })
      })
    )

    const result = await updateCapitalAccountStatus(4, 'inactive')
    expect(receivedBody).toEqual({ status: 'inactive' })
    expect(result.data.status).toBe('inactive')
  })
})

describe('fetchAllCreditAccountsForBuilder', () => {
  it('POSTs an optional search term and returns the credit-account list', async () => {
    let receivedBody: unknown = null
    server.use(
      http.post('*/common/credit-builder/credit-accounts/all', async ({ request }) => {
        receivedBody = await request.json()
        return HttpResponse.json({ status: true, message: 'ok', data: [{ id: 1, card_name: 'Card A', issuer: 'Bank', status: 'active' }] })
      })
    )

    const result = await fetchAllCreditAccountsForBuilder('bank')
    expect(receivedBody).toEqual({ search: 'bank' })
    expect(result.data).toHaveLength(1)
  })

  it('sends search as undefined when not provided', async () => {
    let receivedBody: unknown = 'not-set'
    server.use(
      http.post('*/common/credit-builder/credit-accounts/all', async ({ request }) => {
        receivedBody = await request.json()
        return HttpResponse.json({ status: true, message: 'ok', data: [] })
      })
    )

    await fetchAllCreditAccountsForBuilder()
    expect(receivedBody).toEqual({})
  })
})
