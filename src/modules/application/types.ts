export interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

export interface PaginationMeta {
    current_page: number;
    from: number | null;
    to: number | null;
    per_page: number;
    total: number;
    last_page: number;
    next_page_url: string | null;
    prev_page_url: string | null;
    links: PaginationLink[];
}

export interface PaginatedApiResponse<T> {
    status: boolean;
    message: string;
    data: T[];
    meta: PaginationMeta;
}

export interface SingleApiResponse<T> {
    status: boolean;
    message: string;
    data: T;
}

export interface PreQualificationApplication {
    id: number;
    full_name: string;
    funding_type: string | null;
    business_name: string;
    industry: string;
    date: string;
    requested_amount: string | null;
    status: string;
}

export interface FundingApplication {
    id: number;
    application_number?: string;
    full_name: string;
    industry_type: string;
    entity_type: string;
    purpose_of_funds: string;
    requested_amount: string | null;
    date: string;
    status: string;
}

export interface ApplicationQueryParams {
    page: number;
    per_page: number;
    search: string;
    status: string;
    funding_type?: string;
    start_date: string | null;
    end_date: string | null;
    filters: any;
    sort_field: string;
    sort_order: string;
}

export interface ApplicationStatistics {
    total_applications?: number;
    total_leads?: number;
    approved: number;
    pending: number;
    approved_amount: number;
    new_leads?: number;
    qualified_rate?: string;
    declined_rate?: string;
    [key: string]: any;
}

export const GPT_STATUS = {
    PENDING: 'PENDING',
    COMPLETED: 'COMPLETED',
    INCORRECT: 'INCORRECT',
    FAILED: 'FAILED',
} as const;

export type GptStatus = typeof GPT_STATUS[keyof typeof GPT_STATUS];

export const VALIDATION_STATUS = {
    CORRECT: 'CORRECT',
    INCORRECT: 'INCORRECT',
} as const;

export type ValidationStatus = typeof VALIDATION_STATUS[keyof typeof VALIDATION_STATUS];

export const ISSUE_SEVERITY = {
    INFO: 'INFO',
    WARNING: 'WARNING',
    BLOCKING: 'BLOCKING',
    INCORRECT: 'INCORRECT',
} as const;

export type IssueSeverity = typeof ISSUE_SEVERITY[keyof typeof ISSUE_SEVERITY];

/**
 * FCH_Internal_Prequalification_AUE_v3 — the internal half of an evaluation.
 *
 * Host-only. The API omits the whole ai_result for a non-host caller, so this
 * shape must never be rendered on a borrower, client or partner surface.
 */
export interface InternalAueResult {
    prompt_version?: string;
    submission_id?: string;
    matrix_version?: string | null;
    classification?: string;
    data_status?: string;
    overall_stance?: string;
    aus_model_determination?: Array<{
        product_path?: string;
        model?: string;
        rationale?: string;
    }>;
    executive_underwriting_conclusion?: string;
    borrower_request_snapshot?: Array<{
        field?: string;
        value?: string | number | boolean | null;
        source_status?: string;
    }>;
    underwriting_analysis?: Array<{
        section?: string;
        finding?: string;
        evidence_fields?: string[];
    }>;
    strengths?: string[];
    conditions_and_flags?: Array<{
        category?: string;
        severity?: string;
        finding?: string;
        evidence_fields?: string[];
        required_action?: string;
    }>;
    recommended_funding_paths?: Array<{
        priority?: number;
        product_category?: string;
        aus_model?: string;
        fit_status?: string;
        fit_rationale?: string;
        why_not_higher_priority?: string | null;
        amount_min?: number | null;
        amount_max?: number | null;
        amount_basis?: string;
        conditions?: string[];
        required_documents?: string[];
        execution_action?: string;
        missing_inputs?: string[];
    }>;
    active_lender_matches?: Array<{
        priority?: number;
        lender_name?: string;
        lender_status?: string;
        fit_status?: string;
        rationale?: string;
        eligibility_checks?: string[];
        restrictions_or_conditions?: string[];
    }>;
    required_documentation?: Array<{
        path_or_lender?: string;
        items?: string[];
    }>;
    routing_recommendation?: {
        primary_product?: string | null;
        primary_lender?: string | null;
        aus_model?: string;
        stance?: string;
        next_action?: string;
        fallback_path?: string | null;
        reason?: string;
    };
    credit_building_pathway?: string[];
    manual_review?: {
        required?: boolean;
        reasons?: string[];
    };
    final_internal_disposition?: string;
    closing_tag?: string;
    disclaimer?: string;
}

/** FCH_Client_AUE_v4 — the borrower-safe half, shown to the borrower verbatim. */
export interface ClientAueResult {
    prompt_version?: string;
    submission_id?: string;
    assessment_title?: string;
    funding_readiness_summary?: string;
    readiness_snapshot?: Array<{
        area?: string;
        assessment?: string;
        source_status?: string;
    }>;
    estimated_funding_range?: {
        available?: boolean;
        minimum?: number | null;
        maximum?: number | null;
        basis?: string;
    };
    strengths?: string[];
    areas_requiring_attention?: string[];
    structuring_considerations?: string[];
    submission_positioning_overview?: string;
    required_next_steps?: {
        complete_assessment?: string[];
        underwriting_review?: string[];
        submission_readiness?: string[];
    };
    important_notice?: string;
    final_disclosure?: string;
    disclaimer?: string;
}

export interface AiPrequalResult {
    incorrect?: boolean;
    blocked?: boolean;
    /** The evaluation could not be produced; nothing was generated for this run. */
    failed?: boolean;
    failure_reason?: string | null;
    validation_status?: string;
    borrower_message?: string | null;
    /** The two evaluations are kept whole and separate, never merged. */
    internal?: InternalAueResult | null;
    client?: ClientAueResult | null;
    /** Short, partner-safe note sized for the 1000-char Status Notes field. */
    admin_status_note?: string;
    source?: string;
    model?: string;
    latency_ms?: number;
    is_fallback?: boolean;
    fallback_notice?: string;
}

export const isIncorrectUnderwriting = (
    app?: { gpt_status?: string | null; validation_status?: string | null } | null,
    ai?: AiPrequalResult | null
): boolean => {
    const gpt = (app?.gpt_status || '').toUpperCase();
    const val = (app?.validation_status || '').toUpperCase();

    return Boolean(
        ai?.incorrect ||
        ai?.blocked ||
        gpt === GPT_STATUS.INCORRECT ||
        gpt === 'NEEDS_CORRECTION' ||
        gpt === 'BLOCKED' ||
        val === VALIDATION_STATUS.INCORRECT ||
        val === 'NEEDS_CORRECTION' ||
        val === 'BLOCKED' ||
        val === 'INCORRECT INFORMATION'
    );
};

export interface ValidationIssue {
    code: string;
    field: string;
    category: string;
    severity: 'INFO' | 'WARNING' | 'BLOCKING' | 'INCORRECT';
    user_message: string;
    internal_message: string;
    suggested_action: string;
    evidence_fields: string[];
}

export interface PreQualificationApplicationDetails {
    id: number;
    borrower_id: number;
    validation_status?: string | null;
    validation_summary?: string | null;
    validation_issues?: ValidationIssue[] | null;
    validated_at?: string | null;
    first_name: string;
    last_name: string;
    business_website: string;
    email: string;
    phone_number: string;
    state_of_incorporation: string;
    business_name: string;
    industry_type: string;
    business_structure: string;
    monthly_revenue: string;
    annual_revenue: string;
    years_in_business: string;
    funding_requested_amount: string;
    funding_urgency: string;
    purpose_of_funding: string;
    purpose_note: string | null;
    personal_credit_score: string;
    estimated_business_credit_score: string;
    existing_business_debt: string;
    debt_balance: string;
    notes: string | null;
    status_note: string | null;
    status: string;
    status_class: string;
    gpt_status?: string | null;
    gpt_generated_at?: string | null;
    ai_result?: AiPrequalResult | null;
    created_at: string;
    updated_at: string;
}


export interface CoBorrower {
    id: number;
    first_name: string;
    last_name: string;
    role: string;
    ownership: string;
    email: string;
    mobile_phone: string;
    home_phone: string;
    date_of_birth: string;
    ssn: string;
    street_address: string;
    city: string;
    state: string;
    zip_code: string;
    drivers_license_number: string;
    drivers_license_state: string;
}

export interface DocumentFile {
    id: number;
    funding_application_id: number;
    borrower_id: number;
    borrower_doc_type_id: number;
    name: string;
    path: string;
    url: string;
    original_name: string;
    extension: string;
    mime: string;
    size: number;
    created_at: string;
}

export interface ApplicationDocument {
    type: string;
    files: DocumentFile[];
}

export interface FundingApplicationDetails {
    id: number;
    application_number: string;
    partner_id: number;
    borrower_id: number;
    // The request the edit form opens on, its status, and whether the
    // application's lifecycle key still allows an edit.
    funding_request_id?: number | null;
    funding_request_status?: string | null;
    is_editable?: boolean;
    full_name: string;
    business_name: string;
    business_email: string;
    business_phone_no: string;
    business_country: string;
    business_country_code: string;
    business_address: string;
    business_city: string;
    business_state: string;
    business_postal_code: string;
    industry_type: string;
    entity_type: string;
    years_in_business: string;
    number_of_employees: string;
    first_name: string;
    last_name: string;
    date_of_birth: string;
    ssn: string;
    citizenship_status: string;
    street_address: string;
    country: string;
    city: string;
    state: string;
    zip_code: string;
    ownership: string;
    has_co_borrower: boolean;
    monthly_revenue: string;
    annual_revenue: string;
    business_bank_name: string;
    business_checking_start_date: string;
    self_reported_personal_credit_score: string;
    self_reported_business_credit_score: string;
    has_business_debt: boolean;
    debt_balance: string;
    /** Formatted for display (e.g. "$25,000.00") - not parseable as a number. */
    requested_amount: string;
    /** Raw numeric value - use this for calculations and form inputs. */
    requested_amount_original: number | null;
    purpose_of_funds: string;
    purpose_note: string | null;
    preferred_funding_type: string;
    /** The other funding types the applicant would also consider. */
    additional_funding_types?: string[];
    timeframe_needed: string;
    collateral_available: string;
    credit_pull_authorization: boolean;
    terms_conditions_acceptance: boolean;
    filed_for_bankruptcy: boolean;
    any_pending_lawsuits: boolean;
    has_federal_loan: boolean;
    has_federal_debt: boolean;
    has_criminal_offense: boolean;
    has_parole_or_probation: boolean;
    suspended_or_debarred: boolean;
    any_outstanding_judgments_business: boolean;
    any_outstanding_judgments_owner: boolean;
    federal_compliance_disclosures_explanation: string;
    notes: string | null;
    status_note: string | null;
    status: string;
    status_class: string;
    attestation_authorization: boolean;
    co_borrowers?: CoBorrower[];
    documents?: ApplicationDocument[];

    total_commission?: string | number | null;
    admin_commission?: string | number | null;
    partner_commission?: string | number | null;
    total_commission_amount?: string | number | null;
    admin_commission_amount?: string | number | null;
    partner_commission_amount?: string | number | null;
    commission_status?: string | null;
    payment_status?: string | null;

    total_funded_amount?: string | number | null;
    funded_note?: string | null;
    currency?: string | null;
    currency_symbol?: string | null;
    conversion_rate?: string | number | null;
    
    certificates?: Certificate[];
    download_histories?: DownloadHistory[];
}

export interface Certificate {
    id: number;
    certificate_id: string;
    application_version: string;
    executed_application_sha256: string;
    signature_timestamp: string;
    pdf_generation_timestamp: string;
}

export interface DownloadHistory {
    id: number;
    user_name: string;
    user_type: string;
    file_type: string;
    action: string;
    sha256_hash: string;
    ip_address: string;
    downloaded_at: string;
}
