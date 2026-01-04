export interface Tier {
    id: number;
    name: string;
    title: string;
    subtitle: string;
    description: string;
    status: 'Active' | 'Inactive' | null;
    order: number;
    created_at: string;
    updated_at: string;
    created_by?: number | null;
    updated_by?: number | null;
    deleted_by?: number | null;
    deleted_at?: string | null;
}

export interface TierFormData {
    name: string;
    title: string;
    subtitle: string;
    description: string;
    status: 'Active' | 'Inactive';
    order: number;
}

export interface TierTask {
    id: number;
    tier_id: number;
    title: string;
    subtitle: string;
    description: string;
    url: string;
    button_title: string;
    status: 'active' | 'inactive' | null;
    estimated_completion_days: number;
    order: number;
    manual_verification: boolean | number;
    related_api_id: number | null;
    is_mandatory: number;
    tier_name: string;
    created_at: string;
    updated_at: string;
}

export interface TierTaskFormData {
    tier_id: number;
    title: string;
    subtitle: string;
    description: string;
    url: string;
    button_title: string;
    status: 'active' | 'inactive';
    estimated_completion_days: number;
    order: number;
    manual_verification: boolean | number;
    related_api_id: number | null;
}

export interface TierRelatedApi {
    id: number;
    name: string;
    provider: string;
    base_url: string;
    client_id: string;
    additional_info: string | null;
    tier_id: number;
}

export interface TierRelatedApiResponse {
    status: boolean;
    message: string;
    data: TierRelatedApi[];
}

export interface Link {
    url: string | null;
    label: string;
    active: boolean;
    page: number | null;
}

export interface Meta {
    current_page: number;
    from: number;
    to: number;
    per_page: number;
    total: number;
    last_page: number;
    next_page_url: string | null;
    prev_page_url: string | null;
    links: Link[];
}

export interface ApiResponse<T> {
    status: boolean;
    message: string;
    data: T;
    meta?: Meta;
}

export type TierTasksResponse = ApiResponse<TierTask[]>;

export interface TierVendor {
    id: number;
    tier_id: number;
    name: string;
    category: string;
    requirements: string[] | null;
    benefits: string[] | null;
    report_to: string[] | null;
    status: 'Active' | 'Inactive';
    created_at: string;
    updated_at: string;
}

export interface TierVendorFormData {
    tier_id: number;
    name: string;
    category: string;
    requirements: string[];
    benefits: string[];
    report_to: string[];
    status: 'Active' | 'Inactive';
}

export type TierVendorsResponse = ApiResponse<TierVendor[]>;
