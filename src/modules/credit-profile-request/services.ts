import { apiClient } from '../../lib/http/apiClient';
import { CreditProfileRequestDetailResponse, CreditProfileRequestListResponse } from './types';

export const fetchCreditProfileRequests = async (payload: any = {}): Promise<CreditProfileRequestListResponse> => {
    const response = await apiClient.post('/admin/credit-profile-requests', payload);
    return response.data;
};

export const fetchCreditProfileRequestDetails = async (id: number | string): Promise<CreditProfileRequestDetailResponse> => {
    const response = await apiClient.get(`/admin/credit-profile-requests/${id}`);
    return response.data;
};

/**
 * One authorisation as the PDF sent to iSoftPull.
 *
 * Returned as a blob rather than a link because the endpoint is authenticated -
 * a plain href would arrive without the bearer token.
 */
export const downloadCreditAuthorizationPdf = async (id: number): Promise<Blob> => {
    const response = await apiClient.get(`/credit-authorizations/${id}/download`, {
        responseType: 'blob',
    });
    return response.data;
};
