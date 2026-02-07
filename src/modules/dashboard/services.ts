import { apiClient } from '../../lib/http/apiClient';
import { DashboardResponse } from './types';

export const getDashboardData = async (): Promise<DashboardResponse> => {
    const response = await apiClient.get('/common/dashboard');
    return response.data;
};
