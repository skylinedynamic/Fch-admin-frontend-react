import { apiClient } from '../../lib/http/apiClient';
import type { Client, ClientFilterParams } from './types';

// Base API path
const BASE_PATH = '/common/borrowers'; // Keeping backend endpoint as /borrowers

export const fetchClients = async (params: ClientFilterParams = {}) => {
    // If backend uses POST for filtering
    const { data } = await apiClient.post(`/common/borrowers/fetch-borrowers`, params);
    return data;
    // Or if GET
    // const { data } = await apiClient.get(BASE_PATH, { params });
    // return data;
};

export const fetchClientById = async (id: string | number): Promise<Client> => {
    const { data } = await apiClient.get(`/common/borrowers/${id}`);
    return data;
};

export const createClient = async (payload: Client): Promise<Client> => {
    const { data } = await apiClient.post('/common/borrowers', payload);
    return data;
};

export const updateClient = async (id: string | number, payload: Partial<Client>): Promise<Client> => {
    const { data } = await apiClient.post(`/common/borrowers/${id}`, payload);
    return data;
};

export const deleteClient = async (id: string | number): Promise<void> => {
    await apiClient.delete(`/common/borrowers/${id}`);
};

export const deleteClients = async (ids: (string | number)[]): Promise<void> => {
    await apiClient.post(`/common/borrowers/delete-multiple`, { ids });
};

// If there's a specific fetchAll for dropdowns without pagination
export const fetchAllClients = async () => {
    const { data } = await apiClient.get(`/common/borrowers/all`);
    return data;
};
