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
}
