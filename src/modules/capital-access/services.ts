import { apiClient } from '../../lib/http/apiClient';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface CreditAccountSummary {
    id: number;
    card_name: string;
    issuer: string;
    credit_category?: string;
    typical_personal_fico_min?: number;
    time_in_business_min_months?: number;
    image_url?: string;
    full_image_url?: string;
    status: string;
    sorting_order?: number;
}

export interface CapitalAccount {
    id?: number;
    name: string;
    description?: string;
    status: string;
    credit_accounts?: CreditAccountSummary[];
    // Legacy alias used in some UI parts
    accounts?: CreditAccountSummary[];
    created_at?: string;
    updated_at?: string;
}

export interface StoreCapitalAccessPayload {
    name: string;
    description?: string;
    status?: string;
    /** Ordered array of credit account IDs — index determines sorting_order */
    credit_account_ids?: number[];
}

// ─────────────────────────────────────────────
// Capital Access CRUD
// ─────────────────────────────────────────────

/**
 * Fetch paginated list of capital access programs.
 */
export const fetchCapitalAccounts = async (payload: any = {}) => {
    const response = await apiClient.post(
        '/common/credit-builder/capital-accesses/fetch-all',
        payload
    );
    return response.data;
};

/**
 * Get a single capital access program by ID.
 */
export const getCapitalAccount = async (id: number | string) => {
    const { data } = await apiClient.get(
        `/common/credit-builder/capital-accesses/${id}`
    );
    return data;
};

/**
 * Create a new capital access program.
 */
export const createCapitalAccount = async (payload: StoreCapitalAccessPayload) => {
    const { data } = await apiClient.post(
        '/common/credit-builder/capital-accesses',
        payload
    );
    return data;
};

/**
 * Update an existing capital access program.
 */
export const updateCapitalAccount = async (
    id: number | string,
    payload: StoreCapitalAccessPayload
) => {
    const { data } = await apiClient.put(
        `/common/credit-builder/capital-accesses/${id}`,
        payload
    );
    return data;
};

/**
 * Delete a capital access program.
 */
export const deleteCapitalAccount = async (id: number | string) => {
    const { data } = await apiClient.delete(
        `/common/credit-builder/capital-accesses/${id}`
    );
    return data;
};

/**
 * Update the status of a capital access program.
 */
export const updateCapitalAccountStatus = async (
    id: number | string,
    status: string
) => {
    const { data } = await apiClient.patch(
        `/common/credit-builder/capital-accesses/${id}/status`,
        { status }
    );
    return data;
};

// ─────────────────────────────────────────────
// Credit Accounts (for the drag-and-drop builder)
// ─────────────────────────────────────────────

/**
 * Fetch all Active credit accounts (unfiltered, no pagination) for use in the builder panel.
 */
export const fetchAllCreditAccountsForBuilder = async () => {
    const response = await apiClient.post(
        '/common/credit-builder/credit-accounts/all'
    );
    return response.data;
};
