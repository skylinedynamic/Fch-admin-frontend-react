import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '../../lib/query'
import { fetchGroupedPermissions, createRole, updateRole } from './services'
import type { ApiModulePermissions, CreateRolePayload } from './types'

// Grouped permissions by module
export const useGroupedPermissions = (opts?: { fresh?: boolean }) => {
  const fresh = !!opts?.fresh
  return useQuery<ApiModulePermissions[]>({
    // Use a distinct key when fresh is requested to bypass any cached value
    queryKey: fresh ? queryKeys.role.permissionsGroupedFresh() : queryKeys.role.permissionsGrouped(),
    queryFn: () => fetchGroupedPermissions(),
    // When fresh is requested, ensure no caching and always refetch on mount/focus/reconnect
    staleTime: fresh ? 0 : 1000 * 60 * 1,
    gcTime: fresh ? 0 : undefined,
    refetchOnMount: fresh ? 'always' : false,
    refetchOnWindowFocus: fresh ? 'always' : false,
    refetchOnReconnect: fresh ? 'always' : false,
    keepPreviousData: fresh ? false : true,
  })
}

// Create role mutation
export const useCreateRole = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateRolePayload) => createRole(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.role.list() })
    },
  })
}

// Update role mutation
export const useUpdateRole = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { id: number | string; payload: CreateRolePayload }) => updateRole(input.id, input.payload),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.role.list() })
      qc.invalidateQueries({ queryKey: queryKeys.role.detail(variables.id) })
    },
  })
}
