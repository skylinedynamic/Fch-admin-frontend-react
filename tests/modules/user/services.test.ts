import { afterEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../../mocks/server'
import { fetchRoles, fetchUsers, deleteUsers } from '../../../src/modules/user/services'

afterEach(() => server.resetHandlers())

describe('fetchRoles', () => {
  it('plucks only id/name from each role, discarding other fields', async () => {
    server.use(
      http.post('*/common/roles/fetch-roles', () =>
        HttpResponse.json({ status: true, data: [{ id: 1, name: 'Admin', permissions: ['x'], guard_name: 'web' }] })
      )
    )
    await expect(fetchRoles()).resolves.toEqual([{ id: 1, name: 'Admin' }])
  })

  it('swallows errors and returns an empty array instead of throwing', async () => {
    server.use(http.post('*/common/roles/fetch-roles', () => HttpResponse.error()))
    await expect(fetchRoles()).resolves.toEqual([])
  })
})

describe('fetchUsers', () => {
  it('posts the given filter payload as-is', async () => {
    let receivedBody: unknown = null
    server.use(
      http.post('*/common/users/fetch-users', async ({ request }) => {
        receivedBody = await request.json()
        return HttpResponse.json({ status: true, data: [] })
      })
    )
    await fetchUsers({ search: 'jane', status: 'active' })
    expect(receivedBody).toEqual({ search: 'jane', status: 'active' })
  })

  it('defaults to {} when called with a falsy payload', async () => {
    let receivedBody: unknown = null
    server.use(
      http.post('*/common/users/fetch-users', async ({ request }) => {
        receivedBody = await request.json()
        return HttpResponse.json({ status: true, data: [] })
      })
    )
    await fetchUsers(undefined as any)
    expect(receivedBody).toEqual({})
  })
})

describe('deleteUsers', () => {
  it('posts the id list to the bulk-delete route', async () => {
    let receivedBody: unknown = null
    server.use(
      http.post('*/common/users/multiple-delete', async ({ request }) => {
        receivedBody = await request.json()
        return HttpResponse.json({ status: true, message: 'Deleted' })
      })
    )
    await deleteUsers([1, 2, 3])
    expect(receivedBody).toEqual({ ids: [1, 2, 3] })
  })
})
