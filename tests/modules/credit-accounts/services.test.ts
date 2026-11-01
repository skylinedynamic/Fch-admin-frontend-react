import { afterEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../../mocks/server'
import {
  fetchCreditAccounts,
  getCreditAccount,
  createCreditAccount,
  updateCreditAccount,
  deleteCreditAccount,
  deleteCreditAccounts,
  updateCreditAccountStatus,
  type CreditAccount,
} from '../../../src/modules/credit-accounts/services'

afterEach(() => server.resetHandlers())

const account: CreditAccount = {
  id: 1,
  card_name: 'Chase Ink',
  issuer: 'Chase',
  status: 'active',
}

describe('fetchCreditAccounts', () => {
  it('posts the filter payload and returns the raw response body', async () => {
    let receivedBody: any = null
    server.use(
      http.post('*/admin/credit-builder/credit-accounts/fetch-accounts', async ({ request }) => {
        receivedBody = await request.json()
        return HttpResponse.json({ status: true, message: 'ok', data: [account], meta: { total: 1 } })
      })
    )

    const result = await fetchCreditAccounts({ search: 'chase' })
    expect(receivedBody).toEqual({ search: 'chase' })
    expect(result).toEqual({ status: true, message: 'ok', data: [account], meta: { total: 1 } })
  })

  it('defaults the payload to {} when called with no arguments', async () => {
    let receivedBody: any = null
    server.use(
      http.post('*/admin/credit-builder/credit-accounts/fetch-accounts', async ({ request }) => {
        receivedBody = await request.json()
        return HttpResponse.json({ status: true, message: 'ok', data: [] })
      })
    )

    await fetchCreditAccounts()
    expect(receivedBody).toEqual({})
  })
})

describe('getCreditAccount', () => {
  it('fetches a single account by id and returns the raw response body', async () => {
    server.use(
      http.get('*/admin/credit-builder/credit-accounts/1', () =>
        HttpResponse.json({ status: true, message: 'ok', data: account })
      )
    )

    await expect(getCreditAccount(1)).resolves.toEqual({ status: true, message: 'ok', data: account })
  })
})

describe('createCreditAccount', () => {
  it('posts the new account payload', async () => {
    let receivedBody: any = null
    server.use(
      http.post('*/admin/credit-builder/credit-accounts', async ({ request }) => {
        receivedBody = await request.json()
        return HttpResponse.json({ status: true, message: 'created', data: account })
      })
    )

    await createCreditAccount(account)
    expect(receivedBody).toEqual(account)
  })
})

describe('updateCreditAccount', () => {
  it('puts the updated payload to the account id endpoint', async () => {
    let receivedBody: any = null
    server.use(
      http.put('*/admin/credit-builder/credit-accounts/1', async ({ request }) => {
        receivedBody = await request.json()
        return HttpResponse.json({ status: true, message: 'updated', data: account })
      })
    )

    await updateCreditAccount(1, account)
    expect(receivedBody).toEqual(account)
  })
})

describe('deleteCreditAccount', () => {
  it('sends a DELETE to the account id endpoint', async () => {
    server.use(
      http.delete('*/admin/credit-builder/credit-accounts/1', () =>
        HttpResponse.json({ status: true, message: 'deleted', data: null })
      )
    )

    await expect(deleteCreditAccount(1)).resolves.toEqual({ status: true, message: 'deleted', data: null })
  })
})

describe('deleteCreditAccounts', () => {
  it('posts the selected ids to the multiple-delete endpoint in one call', async () => {
    let body: unknown = null
    server.use(
      http.post('*/admin/credit-builder/credit-accounts/multiple-delete', async ({ request }) => {
        body = await request.json()
        return HttpResponse.json({ status: true, data: { deleted: 2 } })
      })
    )

    const result = await deleteCreditAccounts([71, 72])

    expect(body).toEqual({ ids: [71, 72] })
    expect(result).toEqual({ status: true, data: { deleted: 2 } })
  })
})

describe('updateCreditAccountStatus', () => {
  it('sends the status in the PATCH body', async () => {
    let receivedBody: any = null
    server.use(
      http.patch('*/admin/credit-builder/credit-accounts/1/status', async ({ request }) => {
        receivedBody = await request.json()
        return HttpResponse.json({ status: true, message: 'updated', data: { ...account, status: 'inactive' } })
      })
    )

    await updateCreditAccountStatus(1, 'inactive')
    expect(receivedBody).toEqual({ status: 'inactive' })
  })
})
