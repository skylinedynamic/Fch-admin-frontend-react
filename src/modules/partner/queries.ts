import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '../../lib/query'
import { createPartner, deletePartner, fetchPartnerById, fetchPartners, updatePartner } from './services'
import type { Partner } from './types'

export const usePartners = () => {
  return useQuery({
    queryKey: queryKeys.partner.list(),
    queryFn: fetchPartners,
  })
}

export const usePartner = (id: string | number, enabled = true) => {
  return useQuery({
    queryKey: queryKeys.partner.detail(id),
    queryFn: () => fetchPartnerById(id),
    enabled,
  })
}

export const useCreatePartner = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: Partial<Partner>) => createPartner(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.partner.list() })
    },
  })
}

export const useUpdatePartner = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string | number; payload: Partial<Partner> }) => updatePartner(id, payload),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.partner.detail(variables.id) })
      qc.invalidateQueries({ queryKey: queryKeys.partner.list() })
    },
  })
}

export const useDeletePartner = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string | number) => deletePartner(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.partner.list() })
    },
  })
}