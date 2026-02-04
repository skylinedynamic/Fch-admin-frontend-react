import { apiClient } from '../../lib/http/apiClient';
import { PaginatedApiResponse } from '../application/types';
import { CommissionListItem, CommissionDetail, CommissionFilters } from './types';

export const getCommissions = async (payload: CommissionFilters): Promise<PaginatedApiResponse<CommissionListItem>> => {
    const response = await apiClient.post<PaginatedApiResponse<CommissionListItem>>('/common/commissions', payload);
    return response.data;
};

export const getCommissionById = async (id: string | number): Promise<CommissionDetail> => {
    const response = await apiClient.get<{ status: boolean; message: string; data: CommissionDetail }>(`/common/commissions/${id}`);
    return response.data.data;
};
