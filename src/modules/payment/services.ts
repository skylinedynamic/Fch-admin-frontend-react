import { apiClient } from '../../lib/http/apiClient';
import type { Payment, PaymentFilterParams, PaymentStats } from './types';

export const fetchPayments = async (params: PaymentFilterParams = {}) => {
    const { data } = await apiClient.post('/common/payments/fetch-payments', params);
    return data;
};

export const fetchPaymentStats = async (params: PaymentFilterParams = {}) => {
    const { data } = await apiClient.post('/common/payments/stats', params);
    return data;
};

export const fetchPaymentById = async (id: string | number): Promise<Payment> => {
    const { data } = await apiClient.get(`/common/payments/${id}`);
    return data;
};

export const approvePayment = async (id: string | number, payload: { note: string }) => {
    const { data } = await apiClient.post(`/common/payments/${id}/approve`, payload);
    return data;
};
