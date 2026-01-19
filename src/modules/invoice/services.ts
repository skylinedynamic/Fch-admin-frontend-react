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
