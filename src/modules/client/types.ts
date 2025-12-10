export type Client = {
    id?: number | string;
    // Personal Details
    first_name: string;
    last_name: string;
    phone_number: string;
    country_code?: string;
    email: string;
    signup_id?: string;
    website?: string;

    // Business Info
    legal_business_name?: string;
    business_ein?: string;
    state_file_number?: string;
    duns_number?: string;
    business_address?: string;
    country?: string;
    city?: string;
    other_city?: string;
    state?: string;
    business_zip?: string;
    business_phone?: string;
    entity_type?: string;
    industry_type?: string;
    business_start_date?: string;
    ssn_last_4?: string;
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
    time_in_business?: string;
    funding_urgency?: string;

    // Metadata
    created_at?: string;
    updated_at?: string;
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
    assigned_user_id?: string | number;
};
