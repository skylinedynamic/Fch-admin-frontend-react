import { apiClient } from '../../lib/http/apiClient';
import { CommissionListItem, CommissionDetail, CommissionFilters, CommissionPaginatedResponse, ProcessPayoutPayload } from './types';

export const getCommissions = async (payload: CommissionFilters): Promise<CommissionPaginatedResponse> => {
    const response = await apiClient.post<CommissionPaginatedResponse>('/common/commissions', payload);
    return response.data;
};

export const getCommissionById = async (id: string | number): Promise<CommissionDetail> => {
    const response = await apiClient.get<{ status: boolean; message: string; data: CommissionDetail }>(`/common/commissions/${id}`);
    return response.data.data;
};

export const processPayout = async (id: string | number, payload: ProcessPayoutPayload): Promise<any> => {
    const response = await apiClient.post(`/admin/commission/${id}/payout`, payload);
    return response.data;
};
