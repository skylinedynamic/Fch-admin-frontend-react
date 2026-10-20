import { apiClient } from '../../lib/http/apiClient';
import { Lender, LenderFilterParams } from './types';

export const getLenders = async (params: LenderFilterParams = {}) => {
    const { data } = await apiClient.get('/admin/lenders', { params });
    return data;
};

export const getAllLenders = async () => {
    const { data } = await apiClient.get('/admin/lenders/get/all');
    return data;
};

export const getLender = async (id: number | string) => {
    const { data } = await apiClient.get(`/admin/lenders/${id}`);
    return data;
};

export const createLender = async (payload: Lender) => {
    const { data } = await apiClient.post('/admin/lenders', payload);
    return data;
};

export const updateLender = async (id: number | string, payload: Lender) => {
    const { data } = await apiClient.put(`/admin/lenders/${id}`, payload);
    return data;
};

export const deleteLender = async (id: number | string) => {
    const { data } = await apiClient.delete(`/admin/lenders/${id}`);
    return data;
};

/** Delete the selected lenders in one call - all or none. */
export const deleteLenders = async (ids: Array<number | string>) => {
    const { data } = await apiClient.post('/admin/lenders/multiple-delete', { ids });
    return data;
};

export interface LenderDeletableCheck {
    id: number;
    name: string;
    is_deletable: boolean;
    reason: string | null;
}

/** Whether each lender can be deleted - one assigned to a funding request (or in a funding sequence) cannot. */
export const checkLendersDeletable = async (ids: Array<number | string>): Promise<LenderDeletableCheck[]> => {
    const { data } = await apiClient.post('/admin/lenders/check-deletable', { ids });
    return data?.data ?? [];
};

// Lender Product Categories
export const getLenderProductCategories = async () => {
    const { data } = await apiClient.get('/admin/lenders/product-categories');
    return data;
};

export const createLenderProductCategory = async (payload: { name: string; status?: string; sort_order?: number }) => {
    const { data } = await apiClient.post('/admin/lenders/product-categories', payload);
    return data;
};

export const updateLenderProductCategory = async (id: number | string, payload: { name: string; status?: string; sort_order?: number }) => {
    const { data } = await apiClient.put(`/admin/lenders/product-categories/${id}`, payload);
    return data;
};

export const deleteLenderProductCategory = async (id: number | string) => {
    const { data } = await apiClient.delete(`/admin/lenders/product-categories/${id}`);
    return data;
};
