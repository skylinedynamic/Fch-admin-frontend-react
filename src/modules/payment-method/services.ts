import { apiClient } from '../../lib/http/apiClient';
import type { PaymentProvider } from './types';

export const fetchAdminProviders = async (): Promise<{ status: boolean; data: PaymentProvider[]; message?: string }> => {
    const { data } = await apiClient.get('/admin/payment-methods');
    return data;
};

export const updateAdminProvider = async (id: string | number, payload: { status?: boolean; logo?: string }): Promise<{ status: boolean; data: PaymentProvider; message?: string }> => {
    const { data } = await apiClient.post(`/admin/payment-methods/${id}`, payload);
    return data;
};
