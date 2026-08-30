import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '../../lib/query'
import { fetchAgreement, saveAgreement, fetchAgreements, toggleAgreementStatus } from './services'
import type { AgreementSlug } from './types'




/**
 * Hook to fetch an agreement template by slug.
 */
export const useAgreement = (slug: AgreementSlug, enabled = true) => {
  return useQuery({
    queryKey: queryKeys.agreement.detail(slug),
    queryFn: () => fetchAgreement(slug),
    enabled: !!slug && enabled,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

/**
 * Hook to fetch all agreement templates for a list.
 */
export const useAgreements = (enabled = true) => {
  return useQuery({
    queryKey: queryKeys.agreement.all,
    queryFn: fetchAgreements,
    enabled,
  })
}

/**
 * Hook to save or update an agreement template.
 */
export const useSaveAgreement = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: saveAgreement,
    onSuccess: (res, variables) => {
      if (res.status) {
        qc.invalidateQueries({ queryKey: queryKeys.agreement.detail(variables.slug) })
        qc.invalidateQueries({ queryKey: queryKeys.agreement.all })
      }
    },
  })
}

/**
 * Hook to toggle the active status of an agreement template.
 */
export const useToggleAgreementStatus = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: toggleAgreementStatus,
    onSuccess: (res, variables) => {
      if (res.status) {
        qc.invalidateQueries({ queryKey: queryKeys.agreement.detail(variables.slug) })
        qc.invalidateQueries({ queryKey: queryKeys.agreement.all })
      }
    },
  })
}
