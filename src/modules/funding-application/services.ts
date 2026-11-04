import { apiClient } from '../../lib/http/apiClient'
import { adoptLoadedVersion, rememberSavedVersion, withExpectedVersion } from './applicationVersion'
import type { BusinessInfoResponse, BusinessInfoData, OwnershipInfoResponse, OwnershipInfoData, FinancialInfoResponse, FinancialInfoData, DisclosuresConsentResponse, DisclosuresConsentData, FundingRequestResponse, FundingRequestData, FederalComplianceResponse, FederalComplianceData, AttestationData, AttestationResponse, FundingApplicationDocument, FundingApplicationDocumentsResponse } from './types'

export type BusinessInfoPayload = {
  id: number | null
  full_name: string | null
  business_name: string | null
  business_email: string | null
  business_phone_no: string | null
  business_country: string | null
  business_country_code: string | null
  business_address: string | null
  business_city: string | null
  business_state: string | null
  business_postal_code: string | null
  industry_type: string | null
  entity_type: string | null
  years_in_business: string | null
  number_of_employees: number | null
}

export type FinancialInfoPayload = {
  id: number | null
  monthly_revenue: string | null
  annual_revenue: string | null
  business_bank_name: string | null
  business_checking_start_date: string | null
  self_reported_personal_credit_score: string | null
  self_reported_business_credit_score: string | null
  has_business_debt: boolean
  debt_balance: string | null
}

export type OwnershipInfoPayload = {
  id: number | null
  first_name: string | null
  last_name: string | null
  date_of_birth: string | null
  ssn: string | null
  citizenship_status: string | null
  street_address: string | null
  country: string | null
  city: string | null
  state: string | null
  zip_code: string | null
  ownership: string | null
  has_co_borrower: boolean
}

export type FundingRequestPayload = {
  id: number | null
  funding_request_id?: number | string | null
  funding_sequence_id?: number | string | null
  requested_amount: string | null
  purpose_of_funds: string | null
  approved_funding?: string | null
  preferred_funding_type: string | null
  timeframe_needed: string | null
  collateral_available: string | null
  purpose_note: string | null
}

export type DisclosuresConsentPayload = {
  id: number | null
  funding_request_id?: number | string | null
  funding_sequence_id?: number | string | null
  credit_pull_authorization: boolean
  terms_conditions_acceptance: boolean
}

export type FederalCompliancePayload = {
  id: number | null
  funding_request_id?: number | string | null
  funding_sequence_id?: number | string | null
  filed_for_bankruptcy: boolean | null
  any_pending_lawsuits: boolean | null
  has_federal_loan: boolean | null
  has_federal_debt: boolean | null
  has_criminal_offense: boolean | null
  has_parole_or_probation: boolean | null
  suspended_or_debarred: boolean | null
  any_outstanding_judgments_business: boolean | null
  any_outstanding_judgments_owner: boolean | null
  federal_compliance_disclosures_explanation: string | null
}

export type AttestationPayload = {
  id: number | null
  funding_request_id?: number | string | null
  funding_sequence_id?: number | string | null
  attestation_authorization: boolean
}

export type CoBorrowerValidationPayload = {
  first_name: string
  last_name: string
  role: string
  ownership: string
  email: string
  mobile_phone: string
  home_phone: string
  date_of_birth: string
  ssn: string
  street_address: string
  country: string
  state: string
  city: string
  zip_code: string
  drivers_license_number: string
  drivers_license_state: string
  phone_country_code: string
}

/**
 * A step's load: the wizard starts from the first version it sees.
 */
const loadStep = async <TResponse extends { data: any }>(url: string, params: Record<string, any>): Promise<TResponse['data']> => {
  const { data } = await apiClient.get<TResponse>(url, { params })
  adoptLoadedVersion(data.data)
  return data.data
}

/**
 * A step's save: sent with the version this page is working from, so a save
 * from an older copy is refused (409) rather than overwriting a newer one
 * (R2 BUG-033); the version it returns is the one the next save sends.
 */
const saveStep = async <TResponse extends { data: any }>(url: string, payload: object): Promise<TResponse['data']> => {
  const { data } = await apiClient.post<TResponse>(url, withExpectedVersion(payload))
  rememberSavedVersion(data.data)
  return data.data
}

// Which application a wizard step reads. By its own id when the wizard has it:
// an application converted from the embed form has no funding request.
const lookupParams = (
  fundingRequestId?: number | string | null,
  fundingApplicationId?: number | string | null
): Record<string, number | string> => {
  if (fundingApplicationId) return { funding_application_id: fundingApplicationId }
  return fundingRequestId ? { funding_request_id: fundingRequestId } : {}
}

export const fetchBusinessInfo = async (fundingRequestId?: number | string | null, fundingApplicationId?: number | string | null): Promise<BusinessInfoData> => {
  const params = lookupParams(fundingRequestId, fundingApplicationId)
  return loadStep<BusinessInfoResponse>('/common/funding-application/business-info', params)
}

export const saveBusinessInfo = async (payload: BusinessInfoPayload): Promise<BusinessInfoData> => {
  return saveStep<BusinessInfoResponse>('/common/funding-application/business-info', payload)
}

export const saveOwnershipInfo = async (payload: OwnershipInfoPayload): Promise<OwnershipInfoData> => {
  return saveStep<OwnershipInfoResponse>('/common/funding-application/ownership-info', payload)
}

export const saveFinancialInfo = async (payload: FinancialInfoPayload): Promise<FinancialInfoData> => {
  return saveStep<FinancialInfoResponse>('/common/funding-application/financial-info', payload)
}

export const fetchOwnershipInfo = async (fundingRequestId?: number | string | null, fundingApplicationId?: number | string | null): Promise<OwnershipInfoData> => {
  const params = lookupParams(fundingRequestId, fundingApplicationId)
  return loadStep<OwnershipInfoResponse>('/common/funding-application/ownership-info', params)
}

export const fetchFinancialInfo = async (fundingRequestId?: number | string | null, fundingApplicationId?: number | string | null): Promise<FinancialInfoData> => {
  const params = lookupParams(fundingRequestId, fundingApplicationId)
  return loadStep<FinancialInfoResponse>('/common/funding-application/financial-info', params)
}

export const fetchDisclosuresConsent = async (fundingRequestId?: number | string | null, fundingApplicationId?: number | string | null): Promise<DisclosuresConsentData> => {
  const params = lookupParams(fundingRequestId, fundingApplicationId)
  return loadStep<DisclosuresConsentResponse>('/common/funding-application/disclosures-and-consent', params)
}

export const fetchFundingRequest = async (fundingRequestId?: number | string | null, fundingApplicationId?: number | string | null): Promise<FundingRequestData> => {
  const params = lookupParams(fundingRequestId, fundingApplicationId)
  return loadStep<FundingRequestResponse>('/common/funding-application/funding-request', params)
}

export const saveFundingRequest = async (payload: FundingRequestPayload): Promise<FundingRequestData> => {
  return saveStep<FundingRequestResponse>('/common/funding-application/funding-request', payload)
}

export const saveDisclosuresConsent = async (payload: DisclosuresConsentPayload): Promise<DisclosuresConsentData> => {
  return saveStep<DisclosuresConsentResponse>('/common/funding-application/disclosures-and-consent', payload)
}

export const fetchFederalCompliance = async (fundingRequestId?: number | string | null, fundingApplicationId?: number | string | null): Promise<FederalComplianceData> => {
  const params = lookupParams(fundingRequestId, fundingApplicationId)
  return loadStep<FederalComplianceResponse>('/common/funding-application/federal-compliance-disclosures', params)
}

export const saveFederalCompliance = async (payload: FederalCompliancePayload): Promise<FederalComplianceData> => {
  return saveStep<FederalComplianceResponse>('/common/funding-application/federal-compliance-disclosures', payload)
}

export const fetchAttestation = async (fundingRequestId?: number | string | null, fundingApplicationId?: number | string | null): Promise<AttestationData> => {
  const params = lookupParams(fundingRequestId, fundingApplicationId)
  return loadStep<AttestationResponse>('/common/funding-application/attestation-authorization', params)
}

export const saveAttestation = async (payload: any): Promise<AttestationData> => {
  return saveStep<AttestationResponse>('/common/funding-application/attestation-authorization', payload)
}

export const fetchFundingApplicationDocuments = async (id: number): Promise<FundingApplicationDocument[]> => {
  const { data } = await apiClient.get<FundingApplicationDocumentsResponse>(`/common/funding-application/documents/${id}`)
  return data.data
}

export const deleteFundingApplicationDocument = async (documentId: number): Promise<{ message: string }> => {
  const { data } = await apiClient.delete(`/common/funding-application/documents/${documentId}`)
  return data
}

export const uploadFundingApplicationDocuments = async (payload: {
  funding_application_id: number
  document_type_id: number
  files: string[]
}): Promise<{ message: string }> => {
  const { data } = await apiClient.post('/common/funding-application/documents/upload', payload)
  return data
}

export const validateCoBorrower = async (payload: CoBorrowerValidationPayload): Promise<any> => {
  const { data } = await apiClient.post('/common/funding-application/co-borrower-validation', payload)
  return data
}
