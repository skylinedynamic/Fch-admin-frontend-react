import { apiClient } from '../../lib/http/apiClient';
import { ChangeRequestListResponse, UpdateChangeRequestPayload, UpdateChangeRequestResponse } from './types';

export const fetchChangeRequests = async (payload: any = {}): Promise<ChangeRequestListResponse> => {
    const response = await apiClient.post('/admin/change-requests', payload);
    return response.data;
};

export const updateChangeRequestStatus = async (
    id: number | string,
    payload: UpdateChangeRequestPayload
): Promise<UpdateChangeRequestResponse> => {
    const response = await apiClient.patch(`/admin/change-requests/${id}`, payload);
    return response.data;
};
