import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '../../lib/query'
import { REFRESH_ACTIVITIES_EVENT } from '../../config/appConfig'
import {
  createPartner,
  deletePartner,
  fetchPartnerById,
  fetchPartnerMailNotification,
  fetchPartnerOptions,
  updatePartner,
  updatePartnerCommission,
  updatePartnerMailNotification,
  fetchSubscriptionStats,
} from './services'
import type { Partner, PartnerCommissionPayload, PartnerMailNotificationRecipients, SubscriptionStats } from './types'

/** Every partner for the host's filter dropdowns, loaded once and shared. */
export const usePartnerOptions = (enabled = true) => {
  return useQuery({
    queryKey: queryKeys.partner.options(),
    queryFn: fetchPartnerOptions,
    enabled,
    staleTime: 5 * 60 * 1000,
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

/** Partner profile › Commissions: saves the partner's Funding commission tiers. */
/** Partner profile › Mail Notification: where each type of this partner's notification emails goes. */
export const usePartnerMailNotification = (id: string | number | null | undefined) =>
  useQuery({
    queryKey: queryKeys.partner.mailNotification(id ?? ''),
    queryFn: () => fetchPartnerMailNotification(id as string | number),
    enabled: !!id,
  })

/** Save the recipients; the list the API answers with replaces the cached one. */
export const useUpdatePartnerMailNotification = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, recipients }: { id: string | number; recipients: PartnerMailNotificationRecipients }) =>
      updatePartnerMailNotification(id, recipients),
    onSuccess: (res, { id }) => {
      if (Array.isArray(res?.data)) qc.setQueryData(queryKeys.partner.mailNotification(id), res.data)
      // The API logged "Mail notification updated": show it in the activity sidebar now.
      window.dispatchEvent(new Event(REFRESH_ACTIVITIES_EVENT))
    },
  })
}

export const useUpdatePartnerCommission = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string | number; payload: PartnerCommissionPayload }) => updatePartnerCommission(id, payload),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.partner.detail(variables.id) })
      // The API logged "Commission added / updated / removed": show it in the activity sidebar now.
      window.dispatchEvent(new Event(REFRESH_ACTIVITIES_EVENT))
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

export const useSubscriptionStats = () => {
  return useQuery({
    queryKey: ['subscription-stats'], // Generic key since it's not in lib/query yet
    queryFn: fetchSubscriptionStats,
  })
}