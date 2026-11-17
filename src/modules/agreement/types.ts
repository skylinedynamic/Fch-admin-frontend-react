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

/**
 * A Plan & Fee dynamic value the builder offers for an agreement type
 * (fch-api AgreementPlanFields): `sample` is the price signing fills it with.
 */
export interface AgreementPlanField {
  key: string
  label: string
  group: string
  sample: string
  /** True for the partner's commission table (fch-api AgreementCommissionFields): `sample` is markup. */
  html?: boolean
}

/**
 * Agreement Builder › Save as Template (fch-api AgreementSavedTemplate): an
 * agreement a partner kept under a name, to start from later. The list leaves
 * `template_json` out; the one template picked carries it.
 */
export interface SavedAgreementTemplate {
  id: number
  slug: AgreementSlug
  name: string
  template_json?: string
  created_at?: string
  updated_at?: string
}

export interface SaveAgreementAsTemplatePayload {
  slug: AgreementSlug
  name: string
  /** The builder's { blocks, pagePad, docBg }, as Save Agreement sends it. */
  template_json: string
}

/** The longest template name the API accepts (fch-api AgreementSavedTemplate::NAME_MAX). */
export const SAVED_AGREEMENT_TEMPLATE_NAME_MAX = 100
