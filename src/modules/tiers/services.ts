import { apiClient } from '../../lib/http/apiClient';
import { Tier, TierFormData } from './types';

export const fetchTiers = async (payload: any = {}) => {
    const response = await apiClient.post('/admin/credit-builder/tiers/fetch-tiers', payload);
    return response.data;
};

export const createTier = async (payload: TierFormData): Promise<Tier> => {
    const { data } = await apiClient.post('/admin/credit-builder/tiers', payload);
    return data;
}

export const updateTier = async (id: number, payload: TierFormData): Promise<Tier> => {
    const { data } = await apiClient.put(`/admin/credit-builder/tiers/${id}`, payload);
    return data;
}

export const getTier = async (id: number | string): Promise<Tier> => {
    const { data } = await apiClient.get(`/admin/credit-builder/tiers/${id}`);
    return data;
}

export const deleteTier = async (id: number): Promise<void> => {
    await apiClient.delete(`/admin/credit-builder/tiers/${id}`);
}

export const deleteTiers = async (ids: number[]): Promise<void> => {
    await apiClient.post('/admin/credit-builder/tiers-multiple-delete', { ids });
}
