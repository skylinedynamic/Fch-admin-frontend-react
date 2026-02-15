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

export interface PreQualificationApplicationDetails {
    id: number;
    borrower_id: number;
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
    personal_credit_score: string;
    estimated_business_credit_score: string;
    existing_business_debt: string;
    debt_balance: string;
    notes: string | null;
    status_note: string | null;
    status: string;
    status_class: string;
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
    partner_id: number;
    borrower_id: number;
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
    requested_amount: string;
    purpose_of_funds: string;
    preferred_funding_type: string;
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
}
