import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '../../lib/query'
import { REFRESH_ACTIVITIES_EVENT } from '../../config/appConfig'
import { useConfigPartnerId } from '../settings/configPartner'
import {
  fetchAgreement,
  saveAgreement,
  fetchAgreements,
  toggleAgreementStatus,
  fetchAgreementPreviewValues,
  fetchAgreementPreviewSigners,
  fetchAgreementSignerPreview,
  setAgreementRequired,
  fetchAgreementRequirement,
  fetchAgreementMergeFields,
  fetchSavedAgreementTemplates,
  fetchSavedAgreementTemplate,
  saveAgreementAsTemplate,
  deleteSavedAgreementTemplate,
  updateSavedAgreementTemplate,
} from './services'
import type { AgreementSlug, AgreementPreviewSignerRef, AgreementRequirementStatus, ApiResponse, SaveAgreementAsTemplatePayload, UpdateSavedAgreementTemplatePayload } from './types'

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
    // No template yet answers 404 - a normal state (the editor opens on the
    // default layout), so it is not retried like a failure (R3-BUG-077).
    retry: (failureCount, error) => !isNotFound(error) && failureCount < 1,
  })
}

const isNotFound = (error: unknown) => (error as { response?: { status?: number } })?.response?.status === 404

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

/**
 * Whether this partner / client must sign, and whether the host can change it
 * now (signing and the agreement they would sign both on in Settings › Agreement).
 * Under the agreement keys, so turning a template on or off refreshes it too.
 */
export const useAgreementRequirement = (userId: number | null | undefined, enabled = true) =>
  useQuery({
    queryKey: queryKeys.agreement.requirement(userId ?? 0),
    queryFn: () => fetchAgreementRequirement(userId as number),
    enabled: !!userId && enabled,
  })

/**
 * Excuse one partner / client from signing, or require it again. The saved
 * value goes straight into that user's requirement, so nothing is fetched again.
 */
export const useSetAgreementRequired = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: setAgreementRequired,
    onSuccess: (res, { userId, required }) => {
      qc.setQueryData<ApiResponse<AgreementRequirementStatus>>(queryKeys.agreement.requirement(userId), (prev) =>
        prev?.data ? { ...prev, data: { ...prev.data, agreement_required: res.data?.agreement_required ?? required } } : prev
      )
    },
  })
}

/**
 * The template owner's real details for the builder's preview of the merge
 * fields - and, previewed as one signer, everything signing fills for them.
 */
export const useAgreementPreviewValues = (enabled = true, signer?: AgreementPreviewSignerRef | null) => {
  const partnerId = useConfigPartnerId()
  return useQuery({
    queryKey: forPartnerKey(queryKeys.agreement.previewValues(signer), partnerId),
    queryFn: () => fetchAgreementPreviewValues(partnerId, signer),
    enabled,
    staleTime: 1000 * 60 * 5,
  })
}

/**
 * Preview as Partner / Borrower: the partners (`partner`) or clients (`borrower`)
 * the user may preview as, fetched while the list is open.
 */
export const useAgreementPreviewSigners = (type: AgreementSlug | null, search: string, enabled = true) => {
  const partnerId = useConfigPartnerId()
  const term = search.trim()
  const queryKey = forPartnerKey(queryKeys.agreement.previewSigners(type ?? '', term), partnerId)
  return useQuery({
    queryKey,
    queryFn: () => fetchAgreementPreviewSigners(type as AgreementSlug, term, partnerId),
    enabled: enabled && !!type,
    // The last list stays shown while a new search of the same list loads - never another tab's.
    placeholderData: (previous, previousQuery) => (previousQuery?.queryKey[2] === queryKey[2] ? previous : undefined),
  })
}

/**
 * A partner's / client's Agreement tab: the active agreement they would sign,
 * filled for them. None (404) while that agreement is off, so no retry.
 */
export const useAgreementSignerPreview = (userId: number | null | undefined, enabled = true) =>
  useQuery({
    queryKey: queryKeys.agreement.signerPreview(userId ?? 0),
    queryFn: () => fetchAgreementSignerPreview(userId as number),
    enabled: enabled && !!userId,
    retry: false,
  })

/** The Plan & Fee dynamic values the builder offers for this agreement type. */
export const useAgreementMergeFields = (type: AgreementSlug | null, enabled = true) =>
  useQuery({
    queryKey: queryKeys.agreement.mergeFields(type ?? ''),
    queryFn: () => fetchAgreementMergeFields(type as AgreementSlug),
    enabled: enabled && !!type,
    staleTime: 1000 * 60 * 5,
  })

/** The saved templates of one agreement type (Templates dialog), fetched while it is open. */
export const useSavedAgreementTemplates = (slug: AgreementSlug, enabled = true) => {
  const partnerId = useConfigPartnerId()
  return useQuery({
    queryKey: forPartnerKey(queryKeys.agreement.savedTemplates(slug), partnerId),
    queryFn: () => fetchSavedAgreementTemplates(slug, partnerId),
    enabled: !!slug && enabled,
  })
}

/** One saved template's blocks, fetched when it is picked. */
export const useLoadSavedAgreementTemplate = () => {
  const partnerId = useConfigPartnerId()
  return useMutation({ mutationFn: (id: number) => fetchSavedAgreementTemplate(id, partnerId) })
}

/** Save as Template; the agreement type's list is refreshed. */
export const useSaveAgreementAsTemplate = () => {
  const qc = useQueryClient()
  const partnerId = useConfigPartnerId()
  return useMutation({
    mutationFn: (payload: SaveAgreementAsTemplatePayload) => saveAgreementAsTemplate(payload, partnerId),
    onSuccess: (_res, { slug }) => qc.invalidateQueries({ queryKey: queryKeys.agreement.savedTemplates(slug) }),
  })
}

/** Delete a saved template; the agreement type's list is refreshed. */
export const useDeleteSavedAgreementTemplate = () => {
  const qc = useQueryClient()
  const partnerId = useConfigPartnerId()
  return useMutation({
    mutationFn: ({ id }: { id: number; slug: AgreementSlug }) => deleteSavedAgreementTemplate(id, partnerId),
    onSuccess: (_res, { slug }) => qc.invalidateQueries({ queryKey: queryKeys.agreement.savedTemplates(slug) }),
  })
}

/** Rename a saved template or replace its agreement; the agreement type's list is refreshed. */
export const useUpdateSavedAgreementTemplate = () => {
  const qc = useQueryClient()
  const partnerId = useConfigPartnerId()
  return useMutation({
    mutationFn: ({ id, slug: _slug, ...payload }: UpdateSavedAgreementTemplatePayload & { id: number; slug: AgreementSlug }) =>
      updateSavedAgreementTemplate(id, payload, partnerId),
    onSuccess: (_res, { slug }) => qc.invalidateQueries({ queryKey: queryKeys.agreement.savedTemplates(slug) }),
  })
}
