/** What converting a submission will do - see fetchConversionPreview(). */
export const CONVERSION_MODE = {
  NEW: 'new_borrower',
  EXISTING: 'existing_borrower',
} as const

export type ConversionMode = (typeof CONVERSION_MODE)[keyof typeof CONVERSION_MODE]

/** Submission statuses the screens decide on. */
export const SUBMISSION_STATUS = {
  CONVERTED: 'converted',
  REJECTED: 'rejected',
} as const

/** Why Convert is disabled on a rejected submission (the API refuses it too - BUG-098). */
export const REJECTED_CANNOT_CONVERT = 'Rejected applications cannot be converted. Change the status to convert it.'

/** The client a submission's email already belongs to, as the API shows it. */
export type ExistingBorrowerSummary = {
  id: number
  name?: string | null
  email?: string | null
  phone_number?: string | null
  business_name?: string | null
  status?: string | null
  is_free_trail?: boolean
  partner_name?: string | null
  funding_applications_count?: number
  created_at?: string | null
}

export type ConversionPreview = {
  mode: ConversionMode
  existing_borrower: ExistingBorrowerSummary | null
}
