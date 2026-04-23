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
}

export interface GroupedResources {
    legal_registration: ResourceItem[];
    business_services: ResourceItem[];
    download_assets: ResourceItem[];
    education_help: ResourceItem[];
    training_academy: ResourceItem[];
    [key: string]: ResourceItem[];
}
