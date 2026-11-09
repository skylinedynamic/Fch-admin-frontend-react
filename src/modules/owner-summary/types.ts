import type { CashStream, OwnerSummaryEnvironment, OwnerSummaryPeriodKey, PipelineStage } from '../../config/ownerSummary';

/** GET /common/owner-summary - fch-api OwnerSummaryService::summary(). */

export interface OwnerSummaryParams {
    period: OwnerSummaryPeriodKey;
    environment: OwnerSummaryEnvironment;
}

export interface OwnerSummaryPeriod {
    key: OwnerSummaryPeriodKey;
    timezone: string;
    /** Inclusive local dates, Y-m-d. */
    from: string;
    to: string;
    previous_from: string;
    previous_to: string;
}

export interface CurrentAndPrevious {
    current: number;
    previous: number;
}

export interface AmountAndInvoices {
    amount: number;
    invoices: number;
}

export interface OwnerSummaryKpis {
    cash_collected: CurrentAndPrevious;
    outstanding: AmountAndInvoices;
    funded: { amount: number; deals: number; previous_amount: number };
    new_clients: CurrentAndPrevious;
    new_leads: CurrentAndPrevious;
    active_partners: { current: number; total: number };
}

export interface CashStreamRow {
    stream: CashStream;
    amount: number;
    payments: number;
}

export interface OwnerReceivables {
    unpaid_recent: AmountAndInvoices;
    unpaid_over_30_days: AmountAndInvoices;
    failed: AmountAndInvoices;
}

/** Booked on deals funded in the period - commission records, not cash received. */
export interface OwnerCommissions {
    host_share_booked: number;
    partner_share: number;
    paid_to_partners: number;
    paid_to_staff: number;
    payouts_due: number;
}

export interface OwnerAttention {
    unpaid_over_30_days: AmountAndInvoices;
    failed_invoices: AmountAndInvoices;
    partners_owing: number;
    suspended_partners: number;
    failed_payments: number;
    disputed_payments: number;
    manual_payments_to_approve: number;
    /** Every payout still due, whenever the deal was funded. */
    payouts_due: { amount: number; deals: number };
    unreviewed_embedded_applications: number;
    pending_prequalifications: number;
    trials_ending: { partners: number; clients: number };
    stalled_deals: number;
    /** What all the stalled deals ask for; the stalled_deals list stops at the longest-waiting ones. */
    stalled_requested: number;
}

export interface PipelineGroup {
    key: Exclude<PipelineStage, 'funded'>;
    statuses: string[];
    count: number;
    requested: number;
}

export interface OwnerPipeline {
    open: { count: number; requested: number };
    groups: PipelineGroup[];
    /** Applications that reached each stage during the period (counts, not a conversion rate). */
    activity: Record<PipelineStage, number>;
    median_days_to_fund: number | null;
}

export interface StalledDeal {
    id: number;
    application_number: string | null;
    client: string | null;
    partner: string | null;
    status: string;
    requested_amount: number;
    days_in_status: number;
}

export interface OwnerLeadSources {
    leads: { source: string; count: number }[];
    prequalifications: number;
    embedded_applications: number;
}

export interface OwnerPartners {
    total: number;
    white_label: number;
    certified: number;
    new: number;
    on_trial: number;
    suspended: number;
}

export interface TopPartner {
    id: number;
    company_name: string | null;
    partner_type: string | null;
    leads: number;
    funded_deals: number;
    funded_amount: number;
    commission_share: number;
    commission_paid: number;
}

export interface MonthlyPoint {
    /** Y-m */
    month: string;
    funded: number;
    cash: number;
}

export interface OwnerSummary {
    period: OwnerSummaryPeriod;
    environment: OwnerSummaryEnvironment;
    kpis: OwnerSummaryKpis;
    cash_by_stream: CashStreamRow[];
    receivables: OwnerReceivables;
    commissions: OwnerCommissions;
    attention: OwnerAttention;
    pipeline: OwnerPipeline;
    stalled_deals: StalledDeal[];
    lead_sources: OwnerLeadSources;
    partners: OwnerPartners;
    top_partners: TopPartner[];
    monthly: MonthlyPoint[];
}

export interface OwnerSummaryResponse {
    status: boolean;
    message: string;
    data: OwnerSummary;
}
