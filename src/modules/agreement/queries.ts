import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '../../lib/query'
import { REFRESH_ACTIVITIES_EVENT } from '../../config/appConfig'
import { useConfigPartnerId } from '../settings/configPartner'
import { fetchAgreement, saveAgreement, fetchAgreements, toggleAgreementStatus } from './services'
import type { AgreementSlug } from './types'

/**
 * The cache key an agreement query is held under: the user's own templates,
 * or - inside a ConfigPartnerProvider - that partner's, so the two never mix.
 */
const forPartnerKey = <T extends readonly unknown[]>(key: T, partnerId?: number) =>
  (partnerId ? [...key, { partnerId }] : key) as readonly unknown[]

/**
 * Hook to fetch an agreement template by slug.
 */
export const useAgreement = (slug: AgreementSlug, enabled = true) => {
  const partnerId = useConfigPartnerId()
  return useQuery({
    queryKey: forPartnerKey(queryKeys.agreement.detail(slug), partnerId),
    queryFn: () => fetchAgreement(slug, partnerId),
    enabled: !!slug && enabled,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

/**
 * Hook to fetch all agreement templates for a list.
 */
export const useAgreements = (enabled = true) => {
  const partnerId = useConfigPartnerId()
  return useQuery({
    queryKey: forPartnerKey(queryKeys.agreement.all, partnerId),
    queryFn: () => fetchAgreements(partnerId),
    enabled,
  })
}

/**
 * A save or status change: refresh the slug's template and the list (the
 * user's own and any partner's - they share the key prefix) and, for another
 * partner, its activity sidebar, where the change is logged.
 */
const useAgreementMutation = <TVariables extends { slug: AgreementSlug }>(
  mutationFn: (variables: TVariables, partnerId?: number) => ReturnType<typeof saveAgreement>
) => {
  const qc = useQueryClient()
  const partnerId = useConfigPartnerId()
  return useMutation({
    mutationFn: (variables: TVariables) => mutationFn(variables, partnerId),
    onSuccess: (res, variables) => {
      if (res.status) {
        qc.invalidateQueries({ queryKey: queryKeys.agreement.detail(variables.slug) })
        qc.invalidateQueries({ queryKey: queryKeys.agreement.all })
        if (partnerId) window.dispatchEvent(new Event(REFRESH_ACTIVITIES_EVENT))
      }
    },
  })
}

/**
 * Hook to save or update an agreement template.
 */
export const useSaveAgreement = () => useAgreementMutation(saveAgreement)

/**
 * Hook to toggle the active status of an agreement template.
 */
export const useToggleAgreementStatus = () => useAgreementMutation(toggleAgreementStatus)
