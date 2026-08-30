import { CHANGE_REQUEST_STATUS } from '../../config/borrower';

export type ChangeRequestStatus = typeof CHANGE_REQUEST_STATUS[keyof typeof CHANGE_REQUEST_STATUS];

export interface ChangeRequestBorrower {
    id: number;
    business_name: string | null;
    first_name: string | null;
    last_name: string | null;
}

export interface ChangeRequest {
    id: number;
    partner_id: number | null;
    borrower_id: number;
    field_name: string;
    old_value: string | null;
    new_value: string | null;
    status: ChangeRequestStatus | null;
    updated_by: number | null;
    note: string | null;
    created_at: string;
    updated_at: string;
    borrower_business_name: string | null;
    borrower_first_name: string | null;
    borrower_last_name: string | null;
    updater_name: string | null;
}

export interface ChangeRequestMeta {
    total: number;
    per_page: number;
    current_page: number;
    last_page: number;
}

export interface ChangeRequestListResponse {
    status: boolean;
    message: string;
    data: ChangeRequest[];
    meta: ChangeRequestMeta;
}

export interface UpdateChangeRequestPayload {
    status: ChangeRequestStatus | null;
    note?: string;
}

export interface UpdateChangeRequestResponse {
    status: boolean;
    message: string;
    data: ChangeRequest;
}
