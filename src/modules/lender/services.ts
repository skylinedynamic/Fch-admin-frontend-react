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
