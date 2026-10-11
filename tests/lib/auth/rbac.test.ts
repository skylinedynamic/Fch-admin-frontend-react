import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { useAuthStore } from '../../../src/store/auth/authStore'
import { getPermissions, getRole, hasPermission, hasAnyPermission, hasAllPermissions, hasRole } from '../../../src/lib/auth/rbac'

const setUser = (user: Record<string, unknown> | null) => {
  useAuthStore.setState({ user: user as any })
}

const reset = () => useAuthStore.setState({ token: undefined, user: null, userSubscription: null, rememberMe: true })

describe('rbac', () => {
  beforeEach(reset)
  afterEach(reset)

  it('getPermissions returns the user\'s permissions array, filtering out non-strings', () => {
    setUser({ permissions: ['manage-users', 'edit-roles', 42, null] })
    expect(getPermissions()).toEqual(['manage-users', 'edit-roles'])
  })

  it('getPermissions returns an empty array when there is no user or no permissions field', () => {
    setUser(null)
    expect(getPermissions()).toEqual([])

    setUser({})
    expect(getPermissions()).toEqual([])
  })

  it('getRole returns the role string, or undefined when absent/non-string', () => {
    setUser({ role: 'admin' })
    expect(getRole()).toBe('admin')

    setUser({ role: 123 })
    expect(getRole()).toBeUndefined()

    setUser(null)
    expect(getRole()).toBeUndefined()
  })

  it('hasPermission checks membership in the permissions array', () => {
    setUser({ permissions: ['manage-users'] })
    expect(hasPermission('manage-users')).toBe(true)
    expect(hasPermission('delete-users')).toBe(false)
  })

  it('hasAnyPermission is true when at least one required permission is present', () => {
    setUser({ permissions: ['manage-users'] })
    expect(hasAnyPermission(['delete-users', 'manage-users'])).toBe(true)
    expect(hasAnyPermission(['delete-users', 'edit-roles'])).toBe(false)
  })

  it('hasAllPermissions requires every required permission to be present', () => {
    setUser({ permissions: ['manage-users', 'edit-roles'] })
    expect(hasAllPermissions(['manage-users', 'edit-roles'])).toBe(true)
    expect(hasAllPermissions(['manage-users', 'delete-users'])).toBe(false)
  })

  it('hasRole matches a single role or membership in a role list', () => {
    setUser({ role: 'admin' })
    expect(hasRole('admin')).toBe(true)
    expect(hasRole('partner')).toBe(false)
    expect(hasRole(['partner', 'admin'])).toBe(true)
    expect(hasRole(['partner', 'manager'])).toBe(false)
  })

  it('hasRole is false when there is no user', () => {
    setUser(null)
    expect(hasRole('admin')).toBe(false)
  })

  it(
    'KNOWN GAP: getRole()/hasRole() always resolve false against real API data — ' +
      'the login/refresh-user backend resource (Global/Auth/UserResource) only ever ' +
      'returns role_id/role_name, never a flat "role" string that rbac.ts reads. ' +
      'Currently dead code in practice (no call site in the shipped UI passes a ' +
      '`role` prop to PermissionGuard or calls hasRole() directly — verified via ' +
      'repo-wide search). If this test starts failing because someone wires ' +
      'PermissionGuard/hasRole into a real screen, that is the signal to either map ' +
      'role_name -> role at login time, or change rbac.ts to read role_name instead.',
    () => {
      setUser({ role_id: 3, role_name: 'Admin', permissions: ['manage-users'] })
      expect(getRole()).toBeUndefined()
      expect(hasRole('Admin')).toBe(false)
    }
  )
})
