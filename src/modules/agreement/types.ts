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
  } | null
}
