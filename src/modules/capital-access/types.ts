export interface CreditAccountSummary {
    id: number;
    card_name: string;
    issuer: string;
    credit_category?: string;
    typical_personal_fico_min?: number;
    time_in_business_min_months?: number;
    image_url?: string;
    full_image_url?: string;
    status: string;
    sorting_order?: number;
    pivot?: {
        sorting_order?: number;
        why_this_card?: string;
        est_approval_odds?: number;
        est_approval_odds_for_show?: string;
        est_limit_min?: number;
        est_limit_max?: number;
        est_limit_for_show?: string;
        hard_pull?: string;
        what_you_need?: string[] | string;
        access_time?: string;
        access_day?: number;
        access_day_time?: string;
    };
}

export interface CapitalAccount {
    id?: number;
    name: string;
    sub_title?: string;
    target_exposure_min?: number | string;
    target_exposure_max?: number | string;
    approval_probability?: number | string;
    est_timeline_min?: number | string;
    est_timeline_max?: number | string;
    est_timeline?: string;
    what_you_will_get?: string[];
    pre_flight_checklist?: string[];
    status: string;
    minimum_fico_requirement?: number | null;
    maximum_utilization_threshold?: number | null;
    difficulty_modifier?: number | null;
    allow_recent_late_payment?: boolean;
    late_payment_lookback_months?: number | null;
    credit_accounts?: CreditAccountSummary[];
    // Legacy alias used in some UI parts
    accounts?: CreditAccountSummary[];
    created_at?: string;
    updated_at?: string;
}

export interface StoreCapitalAccessPayload {
    name: string;
    sub_title: string;
    target_exposure_min: number | string;
    target_exposure_max: number | string;
    approval_probability?: number | string;
    est_timeline_min: number | string;
    est_timeline_max: number | string;
    what_you_will_get: string[];
    pre_flight_checklist: string[];
    status?: string;
    minimum_fico_requirement?: number | null;
    maximum_utilization_threshold?: number | null;
    difficulty_modifier?: number | null;
    allow_recent_late_payment?: boolean;
    late_payment_lookback_months?: number | null;
    credit_accounts?: Array<{
        id: number;
        why_this_card: string;
        est_approval_odds?: string;
        est_limit_min: string;
        est_limit_max: string;
        hard_pull: string;
        what_you_need: string[];
        access_time?: string;
        access_day?: number;
        access_day_time?: string;
    }>;
}

export interface CapitalAccessListResponse {
    status: boolean;
    message: string;
    data: CapitalAccount[];
    meta?: {
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };
}

export interface CapitalAccessSingleResponse {
    status: boolean;
    message: string;
    data: CapitalAccount;
}

export interface CapitalAccessMutationResponse {
    status: boolean;
    message: string;
}

export interface CreditAccountsBuilderResponse {
    status: boolean;
    message: string;
    data: CreditAccountSummary[];
}
