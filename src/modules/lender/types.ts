export interface Lender {
    id?: number;
    /** Lender Code ("LND-4821"): made by the API when the lender is created; read-only. */
    lender_code?: string | null;
    name: string;
    legal_name?: string;
    /** "Lender Name - Legal Name", from the API (R2 BUG-008). */
    display_name?: string;
    product_categories?: string[];
    contact_name?: string;
    contact_title?: string;
    contact_email?: string;
    contact_phone?: string;
    website?: string;
    /** Location, all optional; country, state and city by name. */
    country?: string | null;
    state?: string | null;
    city?: string | null;
    /** City > Others on the form: the name typed, sent to the API with city "Others". */
    other_city?: string | null;
    address?: string | null;
    submission_method?: string;
    submission_email?: string;
    submission_portal_link?: string;
    iso_status?: string;
    status?: string;
    internal_notes?: string;
    last_verified_date?: string;
}

/** A lender that already has the name or legal name being typed. */
export interface LenderDuplicate {
    id: number;
    lender_code: string | null;
    name: string;
    legal_name: string | null;
}

/** Lenders that already have the name, and those with the legal name. */
export interface LenderDuplicates {
    name: LenderDuplicate[];
    legal_name: LenderDuplicate[];
}

export interface LenderFilterParams {
    search?: string;
    page?: number;
    per_page?: number;
    sort_field?: string;
    sort_order?: string;
}
