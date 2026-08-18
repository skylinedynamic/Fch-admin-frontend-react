import { apiClient } from '../../lib/http/apiClient';
import type { BillingFilterParams } from './types';

export const fetchUpcomingBilling = async (payload: BillingFilterParams = {}) => {
    const { data } = await apiClient.post('/common/billing/fetch-upcoming', payload);
    return data;
};

export const fetchBillingDetails = async (id: string | number) => {
    const { data } = await apiClient.get(`/common/billing/${id}`);
    return data;
};
