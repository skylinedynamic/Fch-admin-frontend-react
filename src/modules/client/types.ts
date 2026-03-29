export type Client = {
    id?: number | string;
    // Personal Details
    first_name: string;
    last_name: string;
    date_of_birth?: string;
    phone_number: string;
    country_code?: string;
    email: string;
    signup_id?: string;
    business_website?: string;

    // Business Info
    business_name?: string;
    business_ein?: string;
    business_state_file_number?: string;
    business_duns_number?: string;
    business_address?: string;
    business_country?: string;
    business_country_code?: string;
    business_state?: string;
    business_city?: string;
    business_other_city?: string;
    business_postal_code?: string;
    business_phone?: string;
    business_entity_type?: string;
    business_industry_type?: string;
    business_start_date?: string;
    business_last_4_ssn?: string;

    // Home Address (Primary Address in Backend)
    home_address?: string;
    country?: string;
    state?: string;
    city?: string;
    other_city?: string;
    postal_code?: string;

    // Enrollment / Logic
    enrollment_type?: string;
    plan_id?: number | string;
    assign_id?: number | string;
    status?: string;
    notes?: string;

    // Financials
    currency?: string;
    monthly_revenue?: string | number;
    avg_bank_balance?: string | number;
    annual_revenue?: string | number;
    profit_margin?: string | number;
    current_business_debt?: string | number;
    fico_score?: string | number;
    paydex_score?: string | number;
    years_in_business?: string | number;
    number_of_employees?: string | number;
    nsf_days?: string | number;
    funding_urgency?: string;

    // Metadata
    created_at?: string;
    updated_at?: string;
    // Display helpers
    current_tier_name?: string;

    // Additional fields for payload logic
    payment_amount?: string | number;
    amount?: string | number;
    enrollment_amount?: string | number;
    entity_type?: string;
    is_partner_paying?: boolean;

    [key: string]: any;
};

export type ChecklistItem = {
    id: number;
    name: string;
    sort_order: number;
    current_status: boolean;
};

export type ClientFilterParams = {
    search?: string;
    page?: number;
    per_page?: number;
    sort_field?: string;
    sort_order?: 'asc' | 'desc';
    filters?: Record<string, any>;
    partner_id?: string | number;
    assigned_user_id?: string | number; // Kept for compatibility if used elsewhere
    assign_id?: string | number; // Used in Clients.jsx
    current_tier?: string | number; // Used in Clients.jsx
};

export type ClientProfileStats = {
    total_meetings: number;
    total_invoices: number;
    enrollment_type: string;
    total_prequalification: number;
    total_tickets: number;
    total_documents: number;
};

export type BorrowerPlan = {
    id: number | string;
    enrollment_type: string;
    payment_amount: string | number;
    total_amount?: string | number;
    total_installments_count?: number;
    [key: string]: any;
};

export type DropdownOption = {
    label: string;
    value: string | number;
};

export type ClientListStatistics = {
    total_borrowers: number;
    active_borrowers: number;
    inactive_borrowers: number;
    new_this_month: number;
};
