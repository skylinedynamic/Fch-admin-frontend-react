export interface Lender {
    id?: number;
    name: string;
    legal_name?: string;
    product_categories?: string[];
    contact_name?: string;
    contact_title?: string;
    contact_email?: string;
    contact_phone?: string;
    website?: string;
    submission_method?: string;
    submission_email?: string;
    submission_portal_link?: string;
    iso_status?: string;
    status?: string;
    internal_notes?: string;
    last_verified_date?: string;
}

export interface LenderFilterParams {
    search?: string;
    page?: number;
    per_page?: number;
    sort_field?: string;
    sort_order?: string;
}
