import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { queryKeys as appQueryKeys } from '../../lib/query'
import { fetchUsers, fetchUserById, updateUser, deleteUsers, createUser, fetchRoles } from './services'
import type { CreateUserPayload, User } from './types'

export const queryKeys = {
  user: {
    list: (payload?: any) => ['users', payload || {}],
    detail: (id: string | number) => ['users', id],
    roles: () => ['users', 'roles'],
  },
}

export const useRoles = () => {
  return useQuery({
    queryKey: queryKeys.user.roles(),
    queryFn: () => fetchRoles(),
  })
}

export const useCreateUser = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateUserPayload) => createUser(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      // The employee just linked is no longer available for another user.
      qc.invalidateQueries({ queryKey: appQueryKeys.employee.availableForUser() })
    },
  })
}

// useUsers returns the full API payload: { status, message, data, links, pagination }
export const useUsers = (payload?: { page?: number; per_page?: number; search?: string }) => {
  return useQuery({
    queryKey: queryKeys.user.list(payload),
    queryFn: async () => {
      const res = await fetchUsers(payload ?? {})
      return res // whole payload
    },
    placeholderData: keepPreviousData,
    staleTime: 1000 * 60 * 1,
  })
}

export const useUser = (id: string | number, enabled = true) => {
  return useQuery({
    queryKey: queryKeys.user.detail(id),
    queryFn: () => fetchUserById(id),
    enabled,
  })
}

export const useUpdateUser = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string | number; payload: Partial<User> }) => updateUser(id, payload),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.user.detail(variables.id) })
      qc.invalidateQueries({ queryKey: ['users'] })
    },
  })
}

export const useDeleteUser = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string | number) => deleteUsers([id]),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
    },
  })
}
