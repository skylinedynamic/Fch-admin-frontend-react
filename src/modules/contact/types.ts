
export type Contact = {
    id?: number | string;
    full_name: string;
    first_name: string;
    last_name: string;
    company_name?: string;
    mobile_number: string;
    email: string;
    address?: string;
    state?: string;
    country?: string;
    zip_code?: string;
    website?: string;
    notes?: string;
    image?: string | null;
    created_at?: string;
    updated_at?: string;
    [key: string]: any;
};

export type ContactFilterParams = {
    search?: string;
    page?: number;
    per_page?: number;
    sort_field?: string;
    sort_order?: 'asc' | 'desc';
    filters?: Record<string, any>;
};
export interface ContactResponse {
    status: boolean;
    message: string;
    data: Contact;
}

export interface FetchContactsResponse {
    status: boolean;
    message: string;
    data: Contact[];
    meta?: {
        current_page: number;
        last_page: number;
        from: number;
        to: number;
        per_page: number;
        total: number;
    };
}
