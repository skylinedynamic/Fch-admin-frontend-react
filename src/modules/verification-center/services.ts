import { apiClient } from '../../lib/http/apiClient';
import { VerificationResponse } from './types';

export const fetchVerificationRequests = async (payload: any = {}): Promise<VerificationResponse> => {
    const response = await apiClient.post('/common/credit-builder/verification-center-fetch-all', payload);
    return response.data;
};

export const fetchBorrowerVerificationRequests = async (payload: { borrower_id: number | string, page?: number, per_page?: number }): Promise<any> => {
    const response = await apiClient.post('/common/credit-builder/verification-center-borrower-requests', payload);
    return response.data;
};

export const getBorrowerProfile = async (id: string | number) => {
    const { data } = await apiClient.get(`/common/borrowers/get-borrower-profile/${id}`);
    return data;
};

export const updateVerificationStatus = async (payload: { request_ids: (number | string)[], status: string, note?: string, is_api?: boolean }): Promise<any> => {
    const response = await apiClient.post('/common/credit-builder/verification-center-status-update', payload);
    return response.data;
};
