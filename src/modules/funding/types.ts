export interface FundingSequencing {
    id?: number;
    funding_group_id?: number | null;
    funding_type_id?: number | null;
    name: string;
    subtitle?: string;
    description?: string;
    amount_range?: string;
    terms?: string;
    icon?: string;
    icon_color?: string;
    status: string;
    sort_order?: number;
    action_url?: string;
}

export interface FundingFilterParams {
    page?: number;
    per_page?: number;
    sort_field?: string;
    sort_order?: string;
    search?: string;
    filters?: any;
    status?: string;
    funding_group_id?: string | number;
    funding_type_id?: string | number;
}

export interface VisibilityFetchParams extends FundingFilterParams {
    first?: number;
    rows?: number;
    lender_id?: number | string | null;
    lender_product_category_id?: number | string | null;
}

export interface DeleteVisibilityPayload {
    visibility_ids: (number | string)[];
}

export interface UpdateVisibilityPayload {
    lender_visibilities: any[];
    [key: string]: any;
}

export interface SingleLenderVisibilityPayload {
    lender_visibilities: any[];
    [key: string]: any;
}
