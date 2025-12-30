import { apiClient } from '../../lib/http/apiClient';
import { Tier, TierFormData, TierTask, TierTaskFormData, TierRelatedApiResponse, TierTasksResponse } from './types';

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

// Tier Task Services

export const fetchTierTasks = async (payload: any = {}): Promise<TierTasksResponse> => {
    const response = await apiClient.post('/admin/credit-builder/tier-tasks/fetch-tasks', payload);
    return response.data;
};

export const createTierTask = async (payload: TierTaskFormData): Promise<TierTask> => {
    const { data } = await apiClient.post('/admin/credit-builder/tier-tasks', payload);
    return data;
}

export const updateTierTask = async (id: number, payload: TierTaskFormData): Promise<TierTask> => {
    const { data } = await apiClient.put(`/admin/credit-builder/tier-tasks/${id}`, payload);
    return data;
}

export const getTierTask = async (id: number | string): Promise<TierTask> => {
    const { data } = await apiClient.get(`/admin/credit-builder/tier-tasks/${id}`);
    return data;
}

export const deleteTierTask = async (id: number): Promise<void> => {
    await apiClient.delete(`/admin/credit-builder/tier-tasks/${id}`);
}

export const deleteTierTasks = async (ids: number[]): Promise<void> => {
    await apiClient.post('/admin/credit-builder/tier-tasks-multiple-delete', { ids });
}

export const fetchTierRelatedApis = async (tierId: number | string): Promise<TierRelatedApiResponse> => {
    const response = await apiClient.get(`/admin/credit-builder/tier-related-api/${tierId}`);
    return response.data;
}
