// src/modules/role/services.ts
import { apiClient } from '../../lib/http/apiClient'
import type { ApiModulePermissions, GroupedPermissionsObject, CreateRolePayload, RoleDetail } from './types'

// Fetch permissions grouped by module via POST with { is_groupby: true }
export const fetchGroupedPermissions = async (): Promise<ApiModulePermissions[]> => {
  const res = await apiClient.post('/common/permissions', { is_groupby: true })
  const raw = (res?.data?.data ?? res?.data ?? []) as unknown

  // If backend returns an object: { moduleName: [ 'perm a', 'perm b' ] }
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const obj = raw as GroupedPermissionsObject
    return Object.entries(obj).map(([module, perms]) => ({
      module,
      permissions: Array.isArray(perms)
        ? perms.map((p, idx) =>
            typeof p === 'string'
              ? { id: idx, name: p }
              : { id: p.id ?? idx, name: p.name }
          )
        : [],
    }))
  }

  // If backend already returns array of { module, permissions: [{ id?, name }] }
  if (Array.isArray(raw)) {
    const arr = raw as any[]
    if (arr.length && typeof arr[0] === 'object' && 'module' in arr[0]) {
      return arr as ApiModulePermissions[]
    }
  }

  return []
}

// Create a role with { name, permission_ids }
export const createRole = async (payload: CreateRolePayload) => {
  const res = await apiClient.post('/common/roles', payload)
  return res.data
}

// Fetch role details by ID
export const fetchRoleDetail = async (id: number | string): Promise<RoleDetail> => {
  const res = await apiClient.get(`/common/roles/${id}`)
  const data = (res?.data?.data ?? res?.data ?? {}) as any
  const permissionArray: string[] = Array.isArray(data.permission)
    ? data.permission
    : (data.permission && typeof data.permission === 'object'
        ? Object.values(data.permission as Record<string | number, string>)
        : [])

  // Also derive permission IDs when permission is an object map of id -> name
  const permissionIds: number[] = (data.permission && typeof data.permission === 'object' && !Array.isArray(data.permission))
    ? Object.keys(data.permission as Record<string, unknown>)
        .map((k) => Number(k))
        .filter((n) => !Number.isNaN(n))
    : []

  const normalized: RoleDetail & { permission_ids?: number[] } = {
    id: data.id,
    name: data.name,
    // Normalize permission names to string[] for UI
    permission: permissionArray,
    users: Array.isArray(data.users) ? data.users : [],
  }
  if (permissionIds.length) {
    normalized.permission_ids = permissionIds
  }
  return normalized
}

// Update a role with { name, permission_ids }
export const updateRole = async (id: number | string, payload: CreateRolePayload) => {
  const res = await apiClient.put(`/common/roles/${id}`, payload)
  return res.data
}

