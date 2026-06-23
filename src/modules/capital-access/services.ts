import { apiClient } from '../../lib/http/apiClient';
import {
    CapitalAccessListResponse,
    CapitalAccessSingleResponse,
    StoreCapitalAccessPayload,
    CapitalAccessMutationResponse,
    CreditAccountsBuilderResponse
} from './types';

export * from './types';

// ─────────────────────────────────────────────
// Capital Access CRUD
// ─────────────────────────────────────────────

/**
 * Fetch paginated list of capital access programs.
 */
export const fetchCapitalAccounts = async (payload: any = {}): Promise<CapitalAccessListResponse> => {
    const response = await apiClient.post<CapitalAccessListResponse>(
        '/common/capital-accesses/fetch-all',
        payload
    );
    return response.data;
};

/**
 * Get a single capital access program by ID.
 */
export const getCapitalAccount = async (id: number | string): Promise<CapitalAccessSingleResponse> => {
    const { data } = await apiClient.get<CapitalAccessSingleResponse>(
        `/common/capital-accesses/${id}`
    );
    return data;
};

/**
 * Create a new capital access program.
 */
export const createCapitalAccount = async (payload: StoreCapitalAccessPayload): Promise<CapitalAccessSingleResponse> => {
    const { data } = await apiClient.post<CapitalAccessSingleResponse>(
        '/common/capital-accesses',
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
): Promise<CapitalAccessSingleResponse> => {
    const { data } = await apiClient.put<CapitalAccessSingleResponse>(
        `/common/capital-accesses/${id}`,
        payload
    );
    return data;
};

/**
 * Delete a capital access program.
 */
export const deleteCapitalAccount = async (id: number | string): Promise<CapitalAccessMutationResponse> => {
    const { data } = await apiClient.delete<CapitalAccessMutationResponse>(
        `/common/capital-accesses/${id}`
    );
    return data;
};

/**
 * Update the status of a capital access program.
 */
export const updateCapitalAccountStatus = async (
    id: number | string,
    status: string
): Promise<CapitalAccessSingleResponse> => {
    const { data } = await apiClient.patch<CapitalAccessSingleResponse>(
        `/common/capital-accesses/${id}/status`,
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
export const fetchAllCreditAccountsForBuilder = async (search?: string): Promise<CreditAccountsBuilderResponse> => {
    const response = await apiClient.post<CreditAccountsBuilderResponse>(
        '/common/credit-builder/credit-accounts/all',
        { search }
    );
    return response.data;
};
