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
 * The request's full SSN. The details carry it masked; this is the deliberate
 * reveal, which the server logs on the client's activity (R2 BUG-092).
 */
export const revealCreditProfileRequestSsn = async (id: number | string): Promise<string | null> => {
    const response = await apiClient.post(`/admin/credit-profile-requests/${id}/reveal`);
    return response.data?.data?.ssn ?? null;
};

/**
 * One authorisation as the PDF sent to iSoftPull.
 *
 * Returned as a blob rather than a link because the endpoint is authenticated -
 * a plain href would arrive without the bearer token.
 */
export const downloadCreditAuthorizationPdf = async (id: number): Promise<Blob> => {
    // The `common` segment is part of the route, not decoration: artisan
    // reports it as api/v1/common/credit-authorizations/{id}/download. Without
    // it every download 404'd, and with responseType 'blob' the 404 body never
    // surfaced - the button just said it could not download the record.
    const response = await apiClient.get(`/common/credit-authorizations/${id}/download`, {
        responseType: 'blob',
    });
    return response.data;
};
