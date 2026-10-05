import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '../../lib/query/queryKeys'
import { fetchBusinessInfo, saveBusinessInfo, fetchOwnershipInfo, saveOwnershipInfo, fetchFinancialInfo, saveFinancialInfo, fetchDisclosuresConsent, saveDisclosuresConsent, fetchFundingRequest, saveFundingRequest, fetchFederalCompliance, saveFederalCompliance, saveAttestation, fetchAttestation, fetchFundingApplicationDocuments, deleteFundingApplicationDocument, uploadFundingApplicationDocuments, validateCoBorrower } from './services'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { withEditConfirmation } from './editConfirmation'
import type { FundingRequestData, FundingApplicationDocument, AttestationData } from './types'

// The six step saves below are gated: once the borrower has signed and
// submitted, a partner's change withdraws that signature, so the partner is
// asked before the request goes out. Gating here rather than at each button is
// what makes it hold for both the Save button and the wizard's auto-save on tab
// switch. `saveAttestation` is intentionally not gated - signing is what clears
// the warning, not another edit that needs one.

export const useSaveBusinessInfo = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: withEditConfirmation(saveBusinessInfo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.fundingApplication.businessInfo() })
      queryClient.invalidateQueries({ queryKey: queryKeys.fundingApplication.fundingRequest() })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['funding-requests'] })
    },
  })
}

export const useSaveOwnershipInfo = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: withEditConfirmation(saveOwnershipInfo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.fundingApplication.ownershipInfo() })
      queryClient.invalidateQueries({ queryKey: queryKeys.fundingApplication.fundingRequest() })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['funding-requests'] })
    },
  })
}

export const useSaveFinancialInfo = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: withEditConfirmation(saveFinancialInfo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.fundingApplication.financialInfo() })
      queryClient.invalidateQueries({ queryKey: queryKeys.fundingApplication.fundingRequest() })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['funding-requests'] })
    },
  })
}

export const useSaveFundingRequest = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: withEditConfirmation(saveFundingRequest),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.fundingApplication.fundingRequest() })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['funding-requests'] })
    },
  })
}

export const useSaveDisclosuresConsent = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: withEditConfirmation(saveDisclosuresConsent),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.fundingApplication.disclosuresConsent() })
      queryClient.invalidateQueries({ queryKey: queryKeys.fundingApplication.fundingRequest() })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['funding-requests'] })
    },
  })
}

export const useSaveFederalCompliance = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: withEditConfirmation(saveFederalCompliance),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.fundingApplication.federalCompliance() })
      queryClient.invalidateQueries({ queryKey: queryKeys.fundingApplication.fundingRequest() })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['funding-requests'] })
    },
  })
}

export const useSaveAttestation = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: saveAttestation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['funding-requests'] })
      queryClient.invalidateQueries({ queryKey: ['my-applications'] })
    },
  })
}

export const useAttestation = (fundingRequestId?: number | string | null, options?: { enabled?: boolean }) => {
  return useQuery<AttestationData>({
    queryKey: ['attestation', fundingRequestId ?? 'current'],
    queryFn: () => fetchAttestation(fundingRequestId),
    enabled: options?.enabled,
  })
}

export const useBusinessInfo = (fundingRequestId?: number | string | null, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: [...queryKeys.fundingApplication.businessInfo(), fundingRequestId ?? 'current'],
    queryFn: () => fetchBusinessInfo(fundingRequestId),
    enabled: options?.enabled,
  })
}

export const useOwnershipInfo = (fundingRequestId?: number | string | null, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: [...queryKeys.fundingApplication.ownershipInfo(), fundingRequestId ?? 'current'],
    queryFn: () => fetchOwnershipInfo(fundingRequestId),
    enabled: options?.enabled,
  })
}

export const useFinancialInfo = (fundingRequestId?: number | string | null, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: [...queryKeys.fundingApplication.financialInfo(), fundingRequestId ?? 'current'],
    queryFn: () => fetchFinancialInfo(fundingRequestId),
    enabled: options?.enabled,
  })
}

export const useDisclosuresConsent = (fundingRequestId?: number | string | null, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: [...queryKeys.fundingApplication.disclosuresConsent(), fundingRequestId ?? 'current'],
    queryFn: () => fetchDisclosuresConsent(fundingRequestId),
    enabled: options?.enabled,
  })
}

export const useFundingRequest = (fundingRequestId?: number | string | null, options?: { enabled?: boolean }) => {
  return useQuery<FundingRequestData>({
    queryKey: [...queryKeys.fundingApplication.fundingRequest(), fundingRequestId ?? 'current'],
    queryFn: () => fetchFundingRequest(fundingRequestId),
    enabled: options?.enabled,
  })
}

export const useFederalCompliance = (fundingRequestId?: number | string | null, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: [...queryKeys.fundingApplication.federalCompliance(), fundingRequestId ?? 'current'],
    queryFn: () => fetchFederalCompliance(fundingRequestId),
    enabled: options?.enabled,
  })
}

export const useFundingApplicationDocuments = (id: number | null, options?: { enabled?: boolean }) => {
  return useQuery<FundingApplicationDocument[]>({
    queryKey: queryKeys.fundingApplication.documents(id),
    queryFn: () => fetchFundingApplicationDocuments(id!),
    enabled: options?.enabled !== undefined ? options.enabled && !!id : !!id,
  })
}

export const useDeleteFundingApplicationDocument = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteFundingApplicationDocument,
    onSuccess: () => {
      // We'll invalidate in the component since we need the fundingRequestId
    },
  })
}

export const useUploadFundingApplicationDocuments = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: uploadFundingApplicationDocuments,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.fundingApplication.documents(variables.funding_application_id) })
    },
  })
}

export const useValidateCoBorrower = () => {
  return useMutation({
    mutationFn: validateCoBorrower,
  })
}
