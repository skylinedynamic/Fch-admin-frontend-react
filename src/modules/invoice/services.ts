import { apiClient } from '../../lib/http/apiClient';
import type { Invoice, InvoiceFilterParams } from './types';

export const fetchInvoices = async (params: InvoiceFilterParams = {}) => {
    const { data } = await apiClient.post('/common/invoices/fetch-invoices', params);
    return data;
};

export const fetchInvoiceStats = async (params: InvoiceFilterParams = {}) => {
    const { data } = await apiClient.post('/common/invoices/stats', params);
    return data;
};

export const fetchInvoiceDetails = async (id: number | string) => {
    const { data } = await apiClient.get(`/common/invoices/${id}`);
    return data;
};

export const processInvoicePayment = async (payload: any) => {
    const response = await apiClient.post('/process-payment', payload);
    return response.data;
};

export const fetchPartnerPaymentMethods = async () => {
    const { data } = await apiClient.get('/payment/partner-payment-methods');
    return data;
};

export const processUnifiedPayment = async (payload: { provider_id: number; invoice_id: number | string; payment_method_id: string }) => {
    const response = await apiClient.post('/payment/process', payload);
    return response.data;
};

export const downloadInvoice = async (id: number | string) => {
    const { data } = await apiClient.get(`/common/invoices/${id}/download`);
    return data;
};

export const sendInvoice = async (id: number | string) => {
    const { data } = await apiClient.post(`/common/invoices/${id}/send`);
    return data;
};
