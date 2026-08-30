export interface Provider {
    name: string;
    desc: string;
    desc_list?: string[];
    logo?: string;
    is_recommended: boolean;
    btn_label: string;
    link: string;
    sort_order: number;
}

export interface ResourceItem {
    id: number;
    resource_type: string;
    title: string;
    subtitle: string | null;
    status: boolean;
    file?: string | null;
    file_url?: string | null;
    link?: string | null;
    icon?: string | null;
    is_partner: boolean;
    is_borrower: boolean;
    overview?: string[] | null;
    impact?: string[] | null;
    overview_text?: string | null;
    impact_text?: string | null;
    providers?: Provider[] | null;
    sort_order: number;
    created_at: string;
    updated_at: string;
}

export interface ResourceFormData {
    resource_type: string;
    title: string;
    subtitle?: string;
    status: boolean;
    icon?: string;
    is_partner?: boolean;
    is_borrower?: boolean;
    link?: string;
    file?: string | File | null;
    overview?: string[];
    impact?: string[];
    overview_text?: string;
    impact_text?: string;
    providers?: Provider[];
    sort_order?: number;
}

export interface GroupedResources {
    legal_registration: ResourceItem[];
    business_services: ResourceItem[];
    download_assets: ResourceItem[];
    education_help: ResourceItem[];
    training_academy: ResourceItem[];
    [key: string]: ResourceItem[];
}
