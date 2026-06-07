import { apiClient } from '../../lib/http/apiClient';

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

export const fetchFundingSequencings = async (payload: any = {}) => {
    const response = await apiClient.post('/admin/funding-sequencings/fetch', payload);
    return response.data;
};

export const getFundingSequencing = async (id: number | string) => {
    const { data } = await apiClient.get(`/admin/funding-sequencings/${id}`);
    return data;
};

export const createFundingSequencing = async (payload: FundingSequencing) => {
    const { data } = await apiClient.post('/admin/funding-sequencings', payload);
    return data;
};

export const updateFundingSequencing = async (id: number | string, payload: FundingSequencing) => {
    const { data } = await apiClient.put(`/admin/funding-sequencings/${id}`, payload);
    return data;
};

export const updateFundingSequencingDisplay = async (id: number | string, payload: any) => {
    const { data } = await apiClient.put(`/admin/funding-sequencings/${id}/display`, payload);
    return data;
};

export const updateFundingSequencingVisibility = async (id: number | string, payload: any) => {
    const { data } = await apiClient.put(`/admin/funding-sequencings/${id}/visibility`, payload);
    return data;
};

export const deleteFundingSequencing = async (id: number | string) => {
    const { data } = await apiClient.delete(`/admin/funding-sequencings/${id}`);
    return data;
};

export const updateFundingSequencingStatus = async (id: number | string, status: string) => {
    const { data } = await apiClient.patch(`/admin/funding-sequencings/${id}/status`, { status });
    return data;
};

export const getFundingGroups = async () => {
    const { data } = await apiClient.get('/admin/funding-groups');
    return data;
};

export const createFundingGroup = async (payload: { name: string }) => {
    const { data } = await apiClient.post('/admin/funding-groups', payload);
    return data;
};

export const updateFundingGroup = async (id: number | string, payload: { name: string }) => {
    const { data } = await apiClient.put(`/admin/funding-groups/${id}`, payload);
    return data;
};

export const deleteFundingGroup = async (id: number | string) => {
    const { data } = await apiClient.delete(`/admin/funding-groups/${id}`);
    return data;
};

export const getFundingTypes = async () => {
    const { data } = await apiClient.get('/admin/funding-types');
    return data;
};

export const createFundingType = async (payload: { name: string }) => {
    const { data } = await apiClient.post('/admin/funding-types', payload);
    return data;
};

export const updateFundingType = async (id: number | string, payload: { name: string }) => {
    const { data } = await apiClient.put(`/admin/funding-types/${id}`, payload);
    return data;
};

export const deleteFundingType = async (id: number | string) => {
    const { data } = await apiClient.delete(`/admin/funding-types/${id}`);
    return data;
};
