import { apiClient } from '../../lib/http/apiClient'
import { AgreementTemplate, ApiResponse, AgreementSlug, AgreementSignCheck } from './types'

/**
 * `partner_id` for Partner profile › Configuration, where the host edits
 * another partner's agreements; nothing for the user's own (see configPartner).
 */
const forPartner = (partnerId?: number): { partner_id?: number } => (partnerId ? { partner_id: partnerId } : {})

/**
 * Fetch all agreements
 */
export async function fetchAgreements(partnerId?: number): Promise<ApiResponse<AgreementTemplate[]>> {
  const res = await apiClient.get('/common/agreement-templates', { params: forPartner(partnerId) })
  return res.data
}

/**
 * Save or update an agreement template
 * @param payload - Agreement template data
 */
export async function saveAgreement(payload: {
  id?: number
  slug: AgreementSlug
  template_html?: string
  template_json?: string
}, partnerId?: number): Promise<ApiResponse<AgreementTemplate>> {
  try {
    const url = payload.id ? `/common/agreement-templates/save/${payload.id}` : '/common/agreement-templates/save'
    const res = await apiClient.post(url, { ...payload, ...forPartner(partnerId) })
    return res.data
  } catch (err) {
    console.error(`Failed to save ${payload.slug} agreement:`, err);
    throw err
  }
}

/**
 * Fetch an agreement template by slug
 * Uses POST method as requested for the show API.
 * @param slug - 'partner' or 'borrower'
 */
export async function fetchAgreement(
  slug: AgreementSlug,
  partnerId?: number
): Promise<ApiResponse<AgreementTemplate>> {
  try {
    // Current backend show route updated to POST
    const res = await apiClient.post('/common/agreement-templates/show', {
      slug,
      ...forPartner(partnerId)
    })
    return res.data
  } catch (err) {
    if ((err as any)?.response?.status !== 404) {
      console.error(`Failed to fetch ${slug} agreement:`, err);
    }
    throw err
  }
}

/**
 * Toggle active status of an agreement
 */
export async function toggleAgreementStatus(payload: {
  id: number
  slug: AgreementSlug
  is_active: boolean
}, partnerId?: number): Promise<ApiResponse<AgreementTemplate>> {
  try {
    const res = await apiClient.post(`/common/agreement-templates/update-status/${payload.id}`, { ...payload, ...forPartner(partnerId) })
    return res.data
  } catch (err) {
    console.error(`Failed to update status for ID ${payload.id}:`, err);
    throw err
  }
}

/**
 * Check if the authenticated partner needs to sign the agreement.
 * Returns needs_sign flag and the template to display.
 */
export async function checkAgreementSign(): Promise<ApiResponse<AgreementSignCheck>> {
  const res = await apiClient.get('/common/agreement-sign/check')
  return res.data
}

/**
 * Submit the signed agreement for the authenticated partner.
 */
export async function submitAgreementSign(payload: {
  agreement_template_id: number
  content_html?: string | null
  field_values?: Record<string, any> | null
}): Promise<ApiResponse<null>> {
  const res = await apiClient.post('/common/agreement-sign/submit', payload)
  return res.data
}

/**
 * Download signed agreement as PDF.
 */
export async function downloadAgreementSign(userId?: number | string) {
  const url = userId ? `/common/agreement-sign/download/${userId}` : '/common/agreement-sign/download'
  const response = await apiClient.get(url, {
    responseType: 'blob'
  })
  return response
}

/**
 * Fetch the signed agreement HTML snapshot for preview.
 */
export async function fetchSignedAgreementHtml(userId?: number | string): Promise<ApiResponse<{ content_html: string }>> {
  const url = userId ? `/common/agreement-sign/html/${userId}` : '/common/agreement-sign/html'
  const res = await apiClient.get(url)
  return res.data
}

/**
 * Cancel / Revoke a signed agreement for a specific user.
 */
export async function cancelAgreementSign(userId?: number | string): Promise<ApiResponse<null>> {
  const url = userId ? `/common/agreement-sign/cancel/${userId}` : '/common/agreement-sign/cancel'
  const res = await apiClient.post(url)
  return res.data
}
