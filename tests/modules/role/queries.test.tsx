import { afterEach, describe, expect, it } from 'vitest'
import { server } from '../../mocks/server'
import { queryKeys } from '../../../src/lib/query/queryKeys'
import {
  useCreateRole,
  useDeleteRole,
  useGroupedPermissions,
  useRoles,
  useUpdateRole,
} from '../../../src/modules/role/queries'
import { runMutation, runQuery, stub } from '../queryHarness'

afterEach(() => server.resetHandlers())

const PERMISSIONS = [{ module: 'users', permissions: [{ id: 1, name: 'view users' }] }]

describe('useGroupedPermissions', () => {
  it('requests permissions grouped by module', async () => {
    const seen = stub('post', '/common/permissions', { status: true, data: PERMISSIONS })

    const { result } = await runQuery(() => useGroupedPermissions())

    expect(seen.bodies[0]).toEqual({ is_groupby: true })
    expect(result.current.data).toEqual(PERMISSIONS)
  })

  it('caches under the shared key by default', async () => {
    stub('post', '/common/permissions', { status: true, data: PERMISSIONS })

    const { queryClient } = await runQuery(() => useGroupedPermissions())

    expect(queryClient.getQueryData(queryKeys.role.permissionsGrouped())).toEqual(PERMISSIONS)
    expect(queryClient.getQueryData(queryKeys.role.permissionsGroupedFresh())).toBeUndefined()
  })

  it('uses a separate key when fresh data is requested, so the cached list is bypassed', async () => {
    stub('post', '/common/permissions', { status: true, data: PERMISSIONS })

    const { queryClient } = await runQuery(() => useGroupedPermissions({ fresh: true }))

    expect(queryClient.getQueryData(queryKeys.role.permissionsGroupedFresh())).toEqual(PERMISSIONS)
    expect(queryClient.getQueryData(queryKeys.role.permissionsGrouped())).toBeUndefined()
  })
})

describe('useRoles', () => {
  it('fetches and normalises the role list', async () => {
    stub('get', '/common/roles', {
      status: true,
      data: [{ id: 2, name: 'Agent', code: 7, is_static: 1, permissions: { 3: 'view clients' }, usersCount: 4 }],
    })

    const { result } = await runQuery(() => useRoles())

    expect(result.current.data).toEqual([
      { id: 2, name: 'Agent', description: undefined, code: '7', is_static: true, permissions: ['view clients'], users_count: 4 },
    ])
  })
})

describe('role mutations', () => {
  it('useCreateRole posts the role and refreshes the list', async () => {
    const seen = stub('post', '/common/roles', { status: true, message: 'created' })
    const payload = { name: 'Reviewer', description: '', permission_ids: [1, 2] }

    const { invalidated } = await runMutation(() => useCreateRole(), payload as never)

    expect(seen.bodies[0]).toEqual(payload)
    expect(invalidated).toEqual([queryKeys.role.list()])
  })

  it('useUpdateRole puts to the role and refreshes both the list and that role', async () => {
    const seen = stub('put', '/common/roles/5', { status: true })
    const payload = { name: 'Renamed', description: '', permission_ids: [3] }

    const { invalidated } = await runMutation(() => useUpdateRole(), { id: 5, payload } as never)

    expect(seen.bodies[0]).toEqual(payload)
    expect(invalidated).toEqual([queryKeys.role.list(), queryKeys.role.detail(5)])
  })

  it('useDeleteRole posts the id as a numeric array and refreshes the list', async () => {
    const seen = stub('post', '/common/roles/destroy', { status: true })

    const { invalidated } = await runMutation(() => useDeleteRole(), '9' as never)

    expect(seen.bodies[0]).toEqual({ ids: [9] })
    expect(invalidated).toEqual([queryKeys.role.list()])
  })

  it('does not invalidate anything when the mutation fails', async () => {
    stub('post', '/common/roles', { status: false, message: 'Invalid', errors: { name: 'taken' } }, 422)

    const { invalidated, error } = await runMutation(() => useCreateRole(), { name: 'Agent', permission_ids: [] } as never)

    expect(error).toBeTruthy()
    expect(invalidated).toEqual([])
  })
})
