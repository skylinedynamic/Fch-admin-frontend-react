// Common fields shared between list and detail
import { PaginatedApiResponse } from '../application/types';

export interface CommissionStatistics {
    total_commission_amount: string;
    avg_commission_rate: number;
    total_deals: number;
    partner_commission_amount: string;
    total_funded_amount: number;
}

export interface CommissionPaginatedResponse extends PaginatedApiResponse<CommissionListItem> {
    statistics: CommissionStatistics;
}

interface CommissionBase {
    id: number;
    funding_application_id: number;
    total_commission: string;
    admin_commission: string;
    partner_commission: string;
    total_commission_amount: string;
    admin_commission_amount: string;
    partner_commission_amount: string;
    commission_status: string;
    currency: string;
    currency_symbol: string;
    conversion_rate: string;
}

export interface CommissionListItem extends CommissionBase {
    borrower: string;
    partner: string;
    requested_amount: string;
    funded_amount: string | null;
    payment_status: string;
    note: string | null;
    date: string;
}

export interface CommissionDetail extends CommissionBase {
    commission_payment_status: string;
    payout_date: string | null;
    commission_note: string | null;

    borrower_id: number;
    borrower_name: string;
    borrower_business_name: string;
    borrower_business_email: string;
    borrower_business_phone_no: string;
    borrower_business_country: string;
    borrower_business_address: string;
    borrower_business_city: string;
    borrower_business_state: string;
    business_postal_code: string;

    funding_requested_amount: string;
    funded_amount: string | null;
    funding_status: string;
    funding_status_note: string | null;
    funding_industry_type: string;
    funding_entity_type: string;
    funding_purpose_of_funds: string;
    funding_preferred_funding_type: string;
    funded_date: string | null;

    partner_id: number;
    partner_name: string;
    partner_company_name: string;
    partner_email: string;
    partner_phone_number: string;
    partner_type: string;
    partner_logo: string | null;

    /** Clients of the host partner only; null otherwise. */
    payout: CommissionPayout | null;
}

/** Who a commission is paid out to: the partner whose client it is, or the user assigned to a host-partner client. */
export interface CommissionPayee {
    type: 'partner' | 'user';
    id: number | null;
    name: string;
    email: string | null;
}

/** The payout of a commission — the same shape whoever is paid. */
export interface CommissionPayout {
    payee: CommissionPayee | null;
    /** How the user is paid (host-partner clients); null for a partner. */
    paid_by: string | null;
    /** The compensation row that applied: 'Funding', or 'All' services. Users only. */
    service: string | null;
    payout_type: string | null;
    /** A percentage for a Commission, the amount itself for a Flat Amount. Null once paid. */
    rate: number | null;
    /** What the percentage is taken from: 'Admin Commission' or 'Total Commission'. Null once paid. */
    base_label: string | null;
    base_amount: number | null;
    /** Null when there's nothing to pay (no payee, not paid per deal, no rate). Once paid, what the invoice says. */
    amount: number | null;
    is_paid: boolean;
    paid_at: string | null;
    /** How it was paid (Cash, Cheque…), once paid. */
    payment_method: string | null;
    /** True when Make Payment is allowed: something to pay, not paid yet, funding closed. */
    can_pay: boolean;
}

export type Commission = CommissionListItem | CommissionDetail;

export interface CommissionFilters {
    search?: string;
    filters?: any[];
    partner_id?: number | null;
    payment_status?: string | null;
    commission_status?: string | null;
    date_range?: Date[] | null;
    page: number;
    per_page: number;
    sort_field?: string;
    sort_order?: string;
}

export interface ProcessPayoutPayload {
    partner_payment_method: string;
    note?: string;
}
