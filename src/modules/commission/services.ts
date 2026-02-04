import { apiClient } from '../../lib/http/apiClient';
import { PaginatedApiResponse } from '../application/types';
import { Commission, CommissionFilters } from './types';
import { MOCK_COMMISSIONS } from './mockData';

export const getCommissions = async (payload: CommissionFilters): Promise<PaginatedApiResponse<Commission>> => {
    // For demo purposes, returning mock data
    // In a real scenario, this would be: const response = await apiClient.post('/common/commissions', payload);

    // Simulate filtering for demo
    let filtered = [...MOCK_COMMISSIONS];
    if (payload.search_text) {
        const search = payload.search_text.toLowerCase();
        filtered = filtered.filter(c =>
            (c.borrower_name && c.borrower_name.toLowerCase().includes(search)) ||
            (c.partner_name && c.partner_name.toLowerCase().includes(search)) ||
            c.funding_application_id.toString().includes(search)
        );
    }
    if (payload.status) {
        filtered = filtered.filter(c => c.commission_status?.toLowerCase() === payload.status!.toLowerCase());
    }
    if (payload.payment_status) {
        filtered = filtered.filter(c => c.commission_payment_status?.toLowerCase() === payload.payment_status!.toLowerCase());
    }

    const perPage = payload.per_page || 10;
    const page = payload.page || 1;

    return {
        status: true,
        message: 'Commissions fetched successfully',
        data: filtered,
        meta: {
            total: filtered.length,
            current_page: page,
            per_page: perPage,
            last_page: Math.ceil(filtered.length / perPage),
            from: (page - 1) * perPage + 1,
            to: Math.min(page * perPage, filtered.length),
            next_page_url: null,
            prev_page_url: null,
            links: []
        }
    };
};

export const getCommissionById = async (id: string | number): Promise<Commission> => {
    const response = await apiClient.get<any>(`/common/commissions/${id}`);

    // The API might return { status: true, data: { ... } } or just { ... }
    // Based on common patterns in this project (PaginatedApiResponse), it likely returns { status, message, data }
    // However, for single resource GET, sometimes it's direct.
    // Let's assume standard response wrapper: response.data.data
    // If the API implementation is different, we might need to adjust.
    // The user said: "response is : 'id' => $this->id, ..." which implies the payload OF THE DATA object.

    return response.data;
};
