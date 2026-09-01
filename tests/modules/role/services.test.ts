import { afterEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../../mocks/server'
import {
  fetchGroupedPermissions,
  createRole,
  fetchRoles,
  deleteRole,
  fetchRoleDetail,
  updateRole,
} from '../../../src/modules/role/services'

afterEach(() => server.resetHandlers())

describe('fetchGroupedPermissions', () => {
  it('posts { is_groupby: true } and normalizes an object-map response into ApiModulePermissions[]', async () => {
    let receivedBody: unknown = null
    server.use(
      http.post('*/common/permissions', async ({ request }) => {
        receivedBody = await request.json()
        return HttpResponse.json({
          status: true,
          data: { users: ['manage-users', 'edit-users'], roles: [{ id: 9, name: 'manage-roles' }] },
        })
      })
    )
    await expect(fetchGroupedPermissions()).resolves.toEqual([
      { module: 'users', permissions: [{ id: 0, name: 'manage-users' }, { id: 1, name: 'edit-users' }] },
      { module: 'roles', permissions: [{ id: 9, name: 'manage-roles' }] },
    ])
    expect(receivedBody).toEqual({ is_groupby: true })
  })

  it('passes through an already-shaped ApiModulePermissions[] array response unchanged', async () => {
    const shaped = [{ module: 'users', permissions: [{ id: 1, name: 'manage-users' }] }]
    server.use(http.post('*/common/permissions', () => HttpResponse.json({ status: true, data: shaped })))
    await expect(fetchGroupedPermissions()).resolves.toEqual(shaped)
  })

  it('returns an empty array for an unrecognized (non-object, non-module-shaped) response', async () => {
    server.use(http.post('*/common/permissions', () => HttpResponse.json({ status: true, data: ['just-a-string'] })))
    await expect(fetchGroupedPermissions()).resolves.toEqual([])
  })

  it('falls back to the raw body when there is no nested data field', async () => {
    server.use(http.post('*/common/permissions', () => HttpResponse.json({ users: ['manage-users'] })))
    await expect(fetchGroupedPermissions()).resolves.toEqual([{ module: 'users', permissions: [{ id: 0, name: 'manage-users' }] }])
  })
})

describe('createRole / updateRole', () => {
  it('createRole posts the payload to /common/roles', async () => {
    let receivedBody: unknown = null
    server.use(
      http.post('*/common/roles', async ({ request }) => {
        receivedBody = await request.json()
        return HttpResponse.json({ status: true, message: 'Created' })
      })
    )
    await createRole({ name: 'Manager', permission_ids: [1, 2] })
    expect(receivedBody).toEqual({ name: 'Manager', permission_ids: [1, 2] })
  })

  it('updateRole PUTs the payload to the id-scoped route', async () => {
    let calledPath = ''
    let method = ''
    server.use(
      http.put('*/common/roles/:id', ({ request }) => {
        calledPath = new URL(request.url).pathname
        method = request.method
        return HttpResponse.json({ status: true })
      })
    )
    await updateRole(7, { name: 'Manager', permission_ids: [1] })
    expect(calledPath.endsWith('/common/roles/7')).toBe(true)
    expect(method).toBe('PUT')
  })
})

describe('deleteRole', () => {
  it('coerces a string id to a number and posts it wrapped in an ids array', async () => {
    let receivedBody: unknown = null
    server.use(
      http.post('*/common/roles/destroy', async ({ request }) => {
        receivedBody = await request.json()
        return HttpResponse.json({ status: true })
      })
    )
    await deleteRole('12')
    expect(receivedBody).toEqual({ ids: [12] })
  })
})

describe('fetchRoles normalization', () => {
  it('normalizes permissions object-maps to arrays and numeric is_static to boolean, defaulting users_count', async () => {
    server.use(
      http.get('*/common/roles', () =>
        HttpResponse.json({
          data: [
            { id: 1, name: 'Admin', code: 'admin', is_static: 1, permissions: { 0: 'manage-users', 1: 'edit-roles' } },
            { id: 2, name: 'Viewer', code: 'viewer', is_static: false, permissions: ['view-only'], users_count: 4 },
          ],
        })
      )
    )
    await expect(fetchRoles()).resolves.toEqual([
      { id: 1, name: 'Admin', description: undefined, code: 'admin', is_static: true, permissions: ['manage-users', 'edit-roles'], users_count: 0 },
      { id: 2, name: 'Viewer', description: undefined, code: 'viewer', is_static: false, permissions: ['view-only'], users_count: 4 },
    ])
  })

  it('handles a bare array response body (no data wrapper) and a missing/malformed list by returning []', async () => {
    server.use(http.get('*/common/roles', () => HttpResponse.json([{ id: 1, name: 'Admin', code: 'admin' }])))
    const roles = await fetchRoles()
    expect(roles).toHaveLength(1)
    expect(roles[0].id).toBe(1)

    server.resetHandlers()
    server.use(http.get('*/common/roles', () => HttpResponse.json({ status: true })))
    await expect(fetchRoles()).resolves.toEqual([])
  })
})

describe('fetchRoleDetail normalization', () => {
  it('normalizes an object permission map into a string[] and derives numeric permission_ids', async () => {
    server.use(
      http.get('*/common/roles/:id', () =>
        HttpResponse.json({
          data: { id: 3, name: 'Manager', permission: { 5: 'manage-users', 9: 'edit-roles' }, users: [] },
        })
      )
    )
    await expect(fetchRoleDetail(3)).resolves.toEqual({
      id: 3,
      name: 'Manager',
      description: undefined,
      permission: ['manage-users', 'edit-roles'],
      users: [],
      permission_ids: [5, 9],
    })
  })

  it('leaves permission_ids undefined when permission is already an array', async () => {
    server.use(
      http.get('*/common/roles/:id', () =>
        HttpResponse.json({ data: { id: 3, name: 'Manager', permission: ['manage-users'], users: [] } })
      )
    )
    const detail = await fetchRoleDetail(3)
    expect(detail.permission).toEqual(['manage-users'])
    expect((detail as any).permission_ids).toBeUndefined()
  })
})
