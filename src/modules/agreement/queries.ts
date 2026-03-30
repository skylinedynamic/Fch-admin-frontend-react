import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '../../lib/query'
import { fetchAgreement, saveAgreement, fetchAgreements, toggleAgreementStatus } from './services'
import { fetchAppConfig, saveAppConfig } from '../settings/services'
import type { AgreementSlug } from './types'

/**
 * Hook to fetch deep app configuration value.
 */
export const useAppConfig = (key: string, enabled = true) => {
  return useQuery({
    queryKey: ['appConfig', key],
    queryFn: () => fetchAppConfig(key),
    enabled: !!key && enabled,
    staleTime: 1000 * 60 * 60, // 1 hour
  })
}

/**
 * Hook to save app configuration value.
 */
export const useSaveAppConfig = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (variables: { key: string, value: any }) => saveAppConfig(variables.key, variables.value),
    onSuccess: (res, variables) => {
      if (res.status) {
        qc.invalidateQueries({ queryKey: ['appConfig', variables.key] })
      }
    },
  })
}

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
