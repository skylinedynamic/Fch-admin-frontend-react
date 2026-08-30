import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '../../lib/query'
import { createBorrower, deleteBorrower, fetchBorrowerById, fetchBorrowers, updateBorrower } from './services'
import type { Borrower } from './types'

export const useBorrowers = () => {
  return useQuery({
    queryKey: queryKeys.borrower.list(),
    queryFn: fetchBorrowers,
  })
}

export const useBorrower = (id: string | number, enabled = true) => {
  return useQuery({
    queryKey: queryKeys.borrower.detail(id),
    queryFn: () => fetchBorrowerById(id),
    enabled,
  })
}

export const useCreateBorrower = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: Partial<Borrower>) => createBorrower(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.borrower.list() })
    },
  })
}

export const useUpdateBorrower = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string | number; payload: Partial<Borrower> }) => updateBorrower(id, payload),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.borrower.detail(variables.id) })
      qc.invalidateQueries({ queryKey: queryKeys.borrower.list() })
    },
  })
}

export const useDeleteBorrower = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string | number) => deleteBorrower(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.borrower.list() })
    },
  })
}