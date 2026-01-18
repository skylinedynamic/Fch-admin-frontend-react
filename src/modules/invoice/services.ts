import { apiClient } from '../../lib/http/apiClient';
import type { Invoice, InvoiceFilterParams } from './types';

export const fetchInvoices = async (params: InvoiceFilterParams = {}) => {
    const { data } = await apiClient.post('/common/invoices/fetch-invoices', params);
    return data;
};

export const fetchInvoiceStats = async () => {
    // Mocking stats for now based on the layout until endpoint is confirmed
    // Usually these come with the fetch-invoices or a separate endpoint
    return {
        total_invoices_sent: "$3,425",
        total_paid: "$2,222",
        total_unpaid: "$3,438",
        collection_rate: "4%"
    };
};
