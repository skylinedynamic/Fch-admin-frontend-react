export interface BusinessInfoData {
  id: number | null
  full_name: string | null
  business_name: string | null
  business_ein: string | null
  business_phone_no: string | null
  business_address: string | null
  business_country: string | null
  business_country_code: string | null
  business_email: string | null
  duns_number: string | null
  country: string | null
  country_code: string | null
  business_state: string | null
  business_city: string | null
  business_postal_code: string | null
  business_website: string | null
  entity_type: string | null
  industry_type: string | null
  years_in_business: string | null
  number_of_employees: string | null
}

export interface BusinessInfoResponse {
  status: boolean
  message: string
  data: BusinessInfoData
}

export interface OwnershipInfoData {
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
  phone_number: string | null
  co_borrowers?: CoBorrowerApiData[]
}

export interface CoBorrowerApiData {
  id: number
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
  city: string
  state: string
  zip_code: string
  drivers_license_number: string
  drivers_license_state: string
}

export interface OwnershipInfoResponse {
  status: boolean
  message: string
  data: OwnershipInfoData
}

export interface FinancialInfoData {
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

export interface FinancialInfoResponse {
  status: boolean
  message: string
  data: FinancialInfoData
}

export interface DisclosuresConsentData {
  id: number | null
  credit_pull_authorization: boolean
  terms_conditions_acceptance: boolean
}

export interface DisclosuresConsentResponse {
  status: boolean
  message: string
  data: DisclosuresConsentData
}
export interface FundingRequestData {
  id: number | null
  requested_amount: string | null
  purpose_of_funds: string | null
  preferred_funding_type: string | null
  timeframe_needed: string | null
  collateral_available: string | null
  purpose_note: string | null
}

export interface FundingRequestResponse {
  status: boolean
  message: string
  data: FundingRequestData
}

export interface FederalComplianceData {
  id: number | null
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

export interface FederalComplianceResponse {
  status: boolean
  message: string
  data: FederalComplianceData
}

export interface AttestationData {
  id: number | null
  attestation_authorization: boolean
  signature_data?: any
}

export interface AttestationPayload {
  id: number | null
  attestation_authorization?: boolean
  signature_name: string
  esign_consent: boolean
  terms_consent: boolean
  privacy_consent: boolean
  credit_consent: boolean
  legal_binding_consent: boolean
  timezone: string
}

export interface AttestationResponse {
  status: boolean
  message: string
  data: AttestationData
}

export interface FundingApplicationDocument {
  id: number
  funding_application_id: number
  borrower_id: number
  borrower_doc_type_id: number
  name: string
  path: string
  url: string
  original_name: string
  extension: string
  mime: string
  size: number
  created_at: string
}

export interface FundingApplicationDocumentsResponse {
  status: boolean
  message: string
  data: FundingApplicationDocument[]
}
