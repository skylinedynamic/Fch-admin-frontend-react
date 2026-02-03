import { apiClient } from '../../lib/http/apiClient';
import { PaginatedApiResponse } from '../application/types';
import { Commission, CommissionFilters } from './types';

export const getCommissions = async (payload: CommissionFilters): Promise<PaginatedApiResponse<Commission>> => {
    const response = await apiClient.post('/common/commissions', payload);
    return response.data;
};
