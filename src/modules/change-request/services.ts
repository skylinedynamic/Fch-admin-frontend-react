import { apiClient } from '../../lib/http/apiClient';
import { ChangeRequestListResponse, ChangeRequestRevealed, UpdateChangeRequestPayload, UpdateChangeRequestResponse } from './types';

export const fetchChangeRequests = async (payload: any = {}): Promise<ChangeRequestListResponse> => {
    const response = await apiClient.post('/admin/change-requests', payload);
    return response.data;
};

/**
 * An SSN or EIN change's old and new numbers in full - the queue lists them
 * masked (BUG-014). Each call is logged on the client by the API.
 */
export const revealChangeRequest = async (id: number | string): Promise<ChangeRequestRevealed> => {
    const response = await apiClient.post(`/admin/change-requests/${id}/reveal`);
    const { old_value = null, new_value = null } = response.data?.data ?? {};
    return { old_value, new_value };
};

export const updateChangeRequestStatus = async (
    id: number | string,
    payload: UpdateChangeRequestPayload
): Promise<UpdateChangeRequestResponse> => {
    const response = await apiClient.patch(`/admin/change-requests/${id}`, payload);
    return response.data;
};
