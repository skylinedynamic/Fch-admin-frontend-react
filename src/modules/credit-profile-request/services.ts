import { apiClient } from '../../lib/http/apiClient';
import { CreditProfileRequestListResponse, CreditProfileRequestDetailResponse } from './types';

export const fetchCreditProfileRequests = async (payload: any = {}): Promise<CreditProfileRequestListResponse> => {
    const response = await apiClient.post('/admin/credit-profile-requests', payload);
    return response.data;
};

export const fetchCreditProfileRequestDetails = async (id: number | string): Promise<CreditProfileRequestDetailResponse> => {
    const response = await apiClient.get(`/admin/credit-profile-requests/${id}`);
    return response.data;
};
