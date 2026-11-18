import { apiClient } from '../../lib/http/apiClient'
import {
  AgreementTemplate,
  ApiResponse,
  AgreementSlug,
  AgreementSignCheck,
  AgreementPreviewValues,
  AgreementPlanField,
  AgreementRequirement,
  AgreementRequirementStatus,
  SetAgreementRequiredPayload,
  SavedAgreementTemplate,
  SaveAgreementAsTemplatePayload,
  UpdateSavedAgreementTemplatePayload,
} from './types'

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
  agreement_template_version_id?: number
  /** The values entered, by field; the server builds the signed record from them. */
  fields?: Record<string, string | boolean>
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
export async function fetchSignedAgreementHtml(userId?: number | string): Promise<ApiResponse<{ content_html: string; has_sign?: boolean }>> {
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

/**
 * Excuse one partner (from the partner agreement) or one client (from their
 * borrower agreement), or require it again. The host's team only.
 */
export async function setAgreementRequired({ userId, required }: SetAgreementRequiredPayload): Promise<ApiResponse<AgreementRequirement>> {
  const res = await apiClient.post(`/common/agreement-sign/required/${userId}`, { required })
  return res.data
}

/** Whether this partner / client must sign, and whether the host can change it now. The host's team only. */
export async function fetchAgreementRequirement(userId: number): Promise<ApiResponse<AgreementRequirementStatus>> {
  const res = await apiClient.get(`/common/agreement-sign/required/${userId}`)
  return res.data
}

/**
 * The template owner's company details and today's date, for the builder's
 * preview of the {{owner.*}} merge fields - what signing fills them with
 * (fch-api AgreementMergeFields::ownerValues). Keyed by merge field.
 */
export async function fetchAgreementPreviewValues(partnerId?: number): Promise<AgreementPreviewValues> {
  const res = await apiClient.post('/common/agreement-templates/preview-values', forPartner(partnerId))
  return res.data?.data ?? {}
}

/**
 * The Plan & Fee dynamic values the builder offers for this type of agreement:
 * every active plan for the partner agreement, Borrower Enrollment only for the
 * borrower agreement (fch-api AgreementPlanFields).
 */
export async function fetchAgreementMergeFields(type: AgreementSlug): Promise<AgreementPlanField[]> {
  const res = await apiClient.post('/common/agreement-templates/merge-fields', { type })
  return res.data?.data ?? []
}

/** The saved templates of one agreement type, newest first (Templates dialog). */
export async function fetchSavedAgreementTemplates(slug: AgreementSlug, partnerId?: number): Promise<SavedAgreementTemplate[]> {
  const res = await apiClient.get('/common/agreement-templates/saved', { params: { slug, ...forPartner(partnerId) } })
  // Anything but a list would break the Templates dialog: none, then.
  return Array.isArray(res.data?.data) ? res.data.data : []
}

/** One saved template, with its blocks. */
export async function fetchSavedAgreementTemplate(id: number, partnerId?: number): Promise<SavedAgreementTemplate> {
  const res = await apiClient.get(`/common/agreement-templates/saved/${id}`, { params: forPartner(partnerId) })
  return res.data?.data
}

/** Agreement Builder › Save as Template: keep the agreement being edited under a name. */
export async function saveAgreementAsTemplate(
  payload: SaveAgreementAsTemplatePayload,
  partnerId?: number
): Promise<ApiResponse<SavedAgreementTemplate>> {
  const res = await apiClient.post('/common/agreement-templates/saved', { ...payload, ...forPartner(partnerId) })
  return res.data
}

/** Delete a saved template. */
export async function deleteSavedAgreementTemplate(id: number, partnerId?: number): Promise<ApiResponse<null>> {
  const res = await apiClient.delete(`/common/agreement-templates/saved/${id}`, { params: forPartner(partnerId) })
  return res.data
}

/** Rename a saved template, replace its agreement (Save as Template › Replace), or both. */
export async function updateSavedAgreementTemplate(
  id: number,
  payload: UpdateSavedAgreementTemplatePayload,
  partnerId?: number
): Promise<ApiResponse<SavedAgreementTemplate>> {
  const res = await apiClient.put(`/common/agreement-templates/saved/${id}`, { ...payload, ...forPartner(partnerId) })
  return res.data
}
