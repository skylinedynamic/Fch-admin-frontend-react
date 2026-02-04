export interface Commission {
    id: number;
    commission_status: 'Pending' | 'Approved' | 'Declined' | 'Paid' | 'Cancelled';
    commission_payment_status: 'Pending' | 'Paid' | 'Cancelled';
    payout_date: string | null;
    total_commission: string;
    admin_commission: string;
    partner_commission: string;
    total_commission_amount: string;
    admin_commission_amount: string;
    partner_commission_amount: string;
    commission_note: string | null;
    currency: string;
    currency_symbol: string;
    conversion_rate: string;

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

    funding_application_id: number;
    funding_requested_amount: string;
    funding_total_funded_amount: string;
    funding_status: string;
    funding_status_note: string;
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
    partner_contact_person: string;
    partner_contact_person_email: string;
    partner_contact_person_phone_number: string;
    partner_type: string;

    // Computed or other fields
    date?: string;
    funded_amount?: number;
    borrower?: string; // keeping for backward compatibility if needed, or remove if unused
    partner?: string; // keeping for backward compatibility if needed, or remove if unused 
}

export interface CommissionFilters {
    search_text?: string;
    partner_id?: number | null;
    status?: string;
    payment_status?: string;
    date_range?: Date[] | null;
    page: number;
    per_page: number;
    sort_field?: string;
    sort_order?: string;
}
