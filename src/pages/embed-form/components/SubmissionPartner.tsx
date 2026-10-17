import { PARTNER_TYPES } from '../../../config/partnerTypeOptions'

export interface SubmissionPartnerData {
    id?: number
    company_name?: string | null
    full_name?: string | null
    partner_type?: string | null
    is_host?: boolean
}

/** A short label for the partner's type: Host, White Label or Certified. */
export const partnerTypeLabel = (partner?: SubmissionPartnerData | null): string | null => {
    if (!partner) return null
    if (partner.is_host) return 'Host'
    if (partner.partner_type === PARTNER_TYPES.WHITE_LABEL) return 'White Label'
    if (partner.partner_type === PARTNER_TYPES.CERTIFIED) return 'Certified'
    return null
}

/**
 * Which partner an embedded loan application came through - for the host, who
 * sees every partner's applications. The partner's name and a type badge.
 */
export default function SubmissionPartner({ partner }: { partner?: SubmissionPartnerData | null }) {
    const name = partner?.company_name || partner?.full_name
    if (!name) return <span className="text-muted">—</span>

    const type = partnerTypeLabel(partner)

    return (
        <span className="d-inline-flex align-items-center gap-1 flex-wrap">
            <span className="fw-medium text-dark">{name}</span>
            {type && (
                <span className={`badge fs-11 ${partner?.is_host ? 'bg-primary-subtle text-primary' : 'bg-light text-body border'}`}>
                    {type}
                </span>
            )}
        </span>
    )
}
