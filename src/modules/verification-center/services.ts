import { apiClient } from '../../lib/http/apiClient';
import { VerificationResponse } from './types';

export const fetchVerificationRequests = async (payload: any = {}): Promise<VerificationResponse> => {
    const response = await apiClient.post('/common/credit-builder/verification-center-fetch-all', payload);
    return response.data;
};

export const fetchBorrowerVerificationRequests = async (payload: { borrower_id: number | string, partner_id: number | string, page?: number, per_page?: number }): Promise<any> => {
    const response = await apiClient.post('/common/credit-builder/verification-center-borrower-requests', payload);
    return response.data;
};
