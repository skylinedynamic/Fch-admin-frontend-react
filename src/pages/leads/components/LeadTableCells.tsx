import React from 'react';
import type { Lead } from '../../../modules/leads/types';

/**
 * Leads table cells that stack related values, so the table keeps every value
 * in fewer columns: contact over company, email over phone, partner company
 * over its owner's name.
 */

const isBlank = (value?: string | null) => !value || value.trim() === '';

const Missing = () => <span className="text-muted">Null</span>;

export function LeadNameCell({ lead }: { lead: Pick<Lead, 'contact_person' | 'company_name'> }) {
    return (
        <div className="d-flex flex-column">
            <span className="fw-medium text-body">{isBlank(lead.contact_person) ? <Missing /> : lead.contact_person}</span>
            {!isBlank(lead.company_name) && <span className="text-muted fs-12">{lead.company_name}</span>}
        </div>
    );
}

export function LeadContactInfoCell({ lead }: { lead: Pick<Lead, 'email' | 'phone_number'> }) {
    if (isBlank(lead.email) && isBlank(lead.phone_number)) return <Missing />;

    return (
        <div className="d-flex flex-column">
            {!isBlank(lead.email) && (
                <span className="text-body text-nowrap"><i className="ri-mail-line text-muted align-middle me-1"></i>{lead.email}</span>
            )}
            {!isBlank(lead.phone_number) && (
                <span className="text-muted fs-12"><i className="ri-phone-line align-middle me-1"></i>{lead.phone_number}</span>
            )}
        </div>
    );
}

export function LeadPartnerCell({ lead }: { lead: Pick<Lead, 'partner'> }) {
    const company = lead.partner?.company_name;
    const owner = lead.partner?.full_name;
    if (isBlank(company) && isBlank(owner)) return <Missing />;

    return (
        <div className="d-flex flex-column">
            <span className="text-body">{isBlank(company) ? owner : company}</span>
            {!isBlank(company) && !isBlank(owner) && <span className="text-muted fs-12">{owner}</span>}
        </div>
    );
}

/** The status badge, with the lead's type under it when the type is shown. */
export function LeadStatusCell({ badge, leadType, showType }: { badge: React.ReactNode; leadType?: string; showType: boolean }) {
    return (
        <div className="d-flex flex-column align-items-start gap-1">
            {badge}
            {showType && !isBlank(leadType) && <span className="text-muted fs-12">{leadType}</span>}
        </div>
    );
}
