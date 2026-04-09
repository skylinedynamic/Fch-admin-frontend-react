import { apiClient } from '../../lib/http/apiClient';

export interface CreditAccount {
    id?: number;
    card_name: string;
    issuer: string;
    credit_category?: string;
    difficulty_rank?: number;
    difficulty_tier?: string;
    engine_eligibility_band?: string;
    approval_level?: string;
    typical_personal_fico_min?: number;
    typical_personal_fico_ideal?: number;
    time_in_business_min_months?: number;
    revenue_expectation?: string;
    business_credit_required?: string;
    pg_required?: string;
    cash_based?: string;
    velocity_sensitive?: string;
    relationship_required?: string;
    internal_notes?: string;
    portal_tier_unlock?: string;
    borrower_exposure?: string;
    sequencing_priority?: string;
    image_url?: string;
    reference_url?: string;
    status: string;
}

export const fetchCreditAccounts = async (payload: any = {}) => {
    const response = await apiClient.post('/admin/credit-builder/credit-accounts/fetch-accounts', payload);
    return response.data;
};

export const getCreditAccount = async (id: number | string) => {
    const { data } = await apiClient.get(`/admin/credit-builder/credit-accounts/${id}`);
    return data;
};

export const createCreditAccount = async (payload: CreditAccount) => {
    const { data } = await apiClient.post('/admin/credit-builder/credit-accounts', payload);
    return data;
};

export const updateCreditAccount = async (id: number | string, payload: CreditAccount) => {
    const { data } = await apiClient.put(`/admin/credit-builder/credit-accounts/${id}`, payload);
    return data;
};

export const deleteCreditAccount = async (id: number | string) => {
    const { data } = await apiClient.delete(`/admin/credit-builder/credit-accounts/${id}`);
    return data;
};
