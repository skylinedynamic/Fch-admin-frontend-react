export type PersonalInfo = {
  fullName: string
  businessName: string
  email: string
  phoneCountry: string
  phoneNumber: string
}

export type BusinessDetails = {
  businessName: string
  businessAddress: string
  city: string
  state: string
  incorporationState: string
  zip: string
  industryType: string
  entityType: string
  yearsInBusiness: string
  employees: string
}

export type OwnerInfo = {
  id?: number | null
  firstName: string
  /** Optional; first and last are the required parts of a name. */
  middleName?: string
  lastName: string
  dob: string
  ssn: string
  citizenship: string
  streetAddress: string
  country: string
  city: string
  state: string
  zip: string
  ownershipPct: string
  hasCoBorrower: boolean
  phoneNumber: string
  isSaved?: boolean
}

export type CoBorrower = {
  id?: number | null
  firstName: string
  /** Optional; first and last are the required parts of a name. */
  middleName?: string
  lastName: string
  role: string
  ownershipPct: string
  email: string
  mobilePhone: string
  homePhone: string
  streetAddress: string
  country: string
  city: string
  state: string
  zip: string
  ssn: string
  dob: string
  driversLicenseNumber: string
  driversLicenseState: string
}

export type FinancialInfo = {
  id?: number | null
  monthlyRevenue: string
  annualRevenue: string
  bankName: string
  checkingStartDate: string
  personalCreditScore: string
  businessCreditScore: string
  existingDebt: boolean
  debtBalance: string
  isSaved?: boolean
}

export type FundingRequest = {
  requestedAmount: string
  purpose: string
  purposeNote?: string
  approvedFunding: string
  fundingType: string
  timeframe: string
  collateral: string
  is_business_info_saved?: boolean
  is_funding_request_saved?: boolean
  is_ownership_info_saved?: boolean
  is_financial_info_saved?: boolean
  is_disclosures_saved?: boolean
  is_federal_compliance_saved?: boolean
  signature_data?: any
}

export type FileEntry = {
  name: string
  size: number
  type: string
  file: File
}

export type FederalCompliance = {
  legalBusinessName: string
  ein: string
  country: string
  ofacResult: string
  patriotActAck: boolean
  fcraAuth: boolean
  ecoaAck: boolean
  bankruptcy: string
  lawsuit: string
  federalLoanDefault: string
  federalDebtDelinquent: string
  criminalOffense: string
  paroleProbation: string
  suspendedDebarred: string
  judgmentsLiensBusiness: string
  judgmentsLiensOwner: string
  explanation: string
}

export type DisclosureConsent = {
  agreeTerms: boolean
  creditCheckConsent: boolean
  eSignConsent: boolean
  authorizeVerification: boolean
  marketingOptIn: boolean
}

export type Attestation = {
  certify?: boolean // Keep for backward compatibility if needed, but not required
  signature_name: string
  esign_consent: boolean
  esign_consent_timestamp?: number
  terms_consent: boolean
  terms_consent_timestamp?: number
  privacy_consent: boolean
  privacy_consent_timestamp?: number
  credit_consent: boolean
  credit_consent_timestamp?: number
  legal_binding_consent: boolean
  legal_binding_consent_timestamp?: number
}

export const docSections = [
  "Driver's License",
  'Voided Business Check',
  'EIN / Corporation Docs',
  'Business Bank Statements',
  'Equipment Invoice / Quote',
  'A/R Aging Reposrt',
  'Business Plan',
  'Business Tax Returns',
  'Personal Tax Returns',
  'Miscellaneous Documents',
]

export const tabs = [
  'Business Information',
  'Ownership Information',
  'Financial Information',
  'Funding Request',
  'Document Upload',
  'Disclosures and consent',
  'Federal Compliance Disclosures',
]

export const disclosureItems: { key: keyof DisclosureConsent; label: string; route: string }[] = [
  { key: 'agreeTerms', label: 'Credit Pull Authorization', route: '/disclosures/terms' },
  { key: 'creditCheckConsent', label: 'Terms & Conditions Acceptance', route: '/disclosures/credit-check' },
]
