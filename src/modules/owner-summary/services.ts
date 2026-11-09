import { apiClient } from '../../lib/http/apiClient';
import type { OwnerSummaryParams, OwnerSummaryResponse } from './types';

export const OWNER_SUMMARY_ENDPOINT = '/common/owner-summary';

export const getOwnerSummary = async (params: OwnerSummaryParams): Promise<OwnerSummaryResponse> => {
    const response = await apiClient.get<OwnerSummaryResponse>(OWNER_SUMMARY_ENDPOINT, { params });
    return response.data;
};
