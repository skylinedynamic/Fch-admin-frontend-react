import { apiClient } from '../../lib/http/apiClient';
import { VerificationResponse } from './types';

export const fetchVerificationRequests = async (payload: any = {}): Promise<VerificationResponse> => {
    const response = await apiClient.post('/common/credit-builder/verification-center-fetch-all', payload);
    return response.data;
};
