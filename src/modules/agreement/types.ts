export interface AgreementTemplate {
  id?: number
  partner_id?: number | null
  slug: string
  template_html?: string
  template_json?: string | null
  is_active?: boolean
  created_at?: string
  updated_at?: string
}

export interface ApiResponse<T = any> {
  status: boolean
  message?: string
  data?: T
}

export type AgreementSlug = 'partner' | 'borrower' | string

export interface AgreementSignCheck {
  needs_sign: boolean
  template: {
    id: number
    slug: string
    template_html: string
    version_id?: number
    version?: number
  } | null
}

/** Who signs: a partner signs the host's partner agreement, a client their partner's borrower agreement. */
export const AGREEMENT_SIGNER = {
  PARTNER: 'partner',
  CLIENT: 'client',
} as const

export type AgreementSigner = (typeof AGREEMENT_SIGNER)[keyof typeof AGREEMENT_SIGNER]

/** Excuse one partner / client from signing, or require it again (the host's team only). */
export interface SetAgreementRequiredPayload {
  userId: number
  required: boolean
}

export interface AgreementRequirement {
  user_id: number
  agreement_required: boolean
}

/**
 * GET /required/:userId - whether this partner / client must sign, and whether
 * the host can change that now: only while signing is on in Settings › Agreement
 * and the agreement they would sign is active.
 */
export interface AgreementRequirementStatus extends AgreementRequirement {
  signing_enabled: boolean
  template_active: boolean
  can_change: boolean
  locked_reason: string | null
}

/** Merge field => the value signing fills it with, e.g. { 'owner.company_name': 'Acme Lending' }. */
export type AgreementPreviewValues = Record<string, string>
