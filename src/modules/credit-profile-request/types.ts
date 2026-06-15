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
