import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchUsers, fetchUserById, updateUser, deleteUser } from './services'
import type { User } from './types'

export const queryKeys = {
  user: {
    list: (payload?: any) => ['users', payload || {}],
    detail: (id: string | number) => ['users', id],
  },
}

// useUsers returns the full API payload: { status, message, data, links, pagination }
export const useUsers = (payload?: { page?: number; per_page?: number; search?: string }) => {
  return useQuery({
    queryKey: queryKeys.user.list(payload),
    queryFn: async () => {
      const res = await fetchUsers(payload)
      return res // whole payload
    },
    keepPreviousData: true,
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
    mutationFn: (id: string | number) => deleteUser(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
    },
  })
}
