import type { CreditRequestStatus } from '../../config/creditProfileRequest';

export interface CreditProfileRequestBorrower {
    id: number;
    business_name: string | null;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    phone_number: string | null;
}

export interface CreditProfileRequest {
    id: number;
    borrower_id: number;
    /**
     * FCRA authorisations behind this client's credit pulls, newest first.
     * Served with the details rather than on an endpoint of its own, and empty
     * for anyone but the host partner.
     */
    credit_authorizations?: CreditAuthorization[];
    /** Latest iSoftPull pull, e.g. "Sep 16, 2026 02:30 AM" in the viewer's time zone. Host partner only. */
    credit_last_pulled_at?: string | null;
    first_name: string;
    middle_name: string | null;
    last_name: string;
    address: string;
    apt_suite_other: string | null;
    city: string;
    state: string;
    zip: string;
    ssn: string;
    date_of_birth: string;
    phone: string;
    email: string;
    created_at: string;
    updated_at: string;
    borrower?: CreditProfileRequestBorrower;
    /** List only: pending until the client's latest request has been pulled. */
    request_status?: CreditRequestStatus | null;
}

export interface CreditProfileRequestMeta {
    total: number;
    per_page: number;
    current_page: number;
    last_page: number;
}

export interface CreditProfileRequestListResponse {
    status: boolean;
    message: string;
    data: {
        current_page: number;
        data: CreditProfileRequest[];
        first_page_url: string;
        from: number;
        last_page: number;
        last_page_url: string;
        links: any[];
        next_page_url: string | null;
        path: string;
        per_page: number;
        prev_page_url: string | null;
        to: number;
        total: number;
    };
}

export interface CreditProfileRequestDetailResponse {
    status: boolean;
    message: string;
    data: CreditProfileRequest;
}

/**
 * One client's agreement to one credit pull - the FCRA evidence record.
 *
 * `authorization_version` is a string ('1.0'), not a number: it is matched
 * against the version history published on the authorisation page, and a float
 * would render as "1".
 */
export interface CreditAuthorization {
    id: number;
    authorization_version: string;
    authorization_url: string;
    /** Ready-made line for citing the published wording. */
    citation: string;
    credit_authorization_accepted: boolean;
    e_consent_accepted: boolean;
    /** e.g. "Sep 16, 2026 02:30 AM", in the viewer's time zone (converted by the API from X-Timezone). */
    consented_at: string | null;
    ip_address: string | null;
    user_agent: string | null;
    isoftpull_transaction_id: string | null;
    /** Same format and zone as consented_at; null until the pull has run. */
    pulled_at: string | null;
}
