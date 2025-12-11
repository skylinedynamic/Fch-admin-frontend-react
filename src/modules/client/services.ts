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

export const deleteClients = async (ids: (string | number)[]): Promise<any> => {
    const { data } = await apiClient.post(`/common/borrowers-multiple-delete`, { ids });
    return data;
};

export const fetchAllClients = async () => {
    const { data } = await apiClient.get(`/common/borrowers/all`);
    return data;
};

export const fetchClientChecklist = async (borrowerId: string | number): Promise<any> => {
    const { data } = await apiClient.get(`/common/borrower-documents-checklist/${borrowerId}`);
    return data;
};

export const saveClientChecklist = async (borrowerId: string | number, checkedIds: number[]): Promise<any> => {
    const { data } = await apiClient.post(`/common/borrower-documents-checklist/save/${borrowerId}`, {
        checked_doc_type_ids: checkedIds
    });
    return data;
};

// Fetch borrower stats (for list page)
export const fetchBorrowerStats = async (partnerId?: string | number): Promise<any> => {
    const endpoint = partnerId
        ? `/common/borrowers-stats/${partnerId}`
        : `/common/borrowers-stats`;
    const { data } = await apiClient.post(endpoint);
    return data;
};

// Fetch borrower profile stats details (for detail page)
export const fetchBorrowerProfileStats = async (borrowerId: string | number): Promise<any> => {
    const { data } = await apiClient.post(`/common/borrowers-profile-states-details-count/${borrowerId}`);
    return data;
};

// Fetch borrower documents
export const fetchBorrowerDocuments = async (borrowerId: string | number): Promise<any> => {
    const { data } = await apiClient.post(`/common/borrowers-documents/${borrowerId}`);
    return data;
};

// Download borrower document
export const downloadBorrowerDocument = async (documentId: string | number): Promise<any> => {
    const response = await apiClient.get(`/common/borrowers-documents/download/${documentId}`, {
        responseType: 'blob'
    });
    return response;
};

// Fetch all users for borrower module
export const fetchBorrowerUsers = async (): Promise<any> => {
    const { data } = await apiClient.post('/common/borrowers-get-all-users');
    return data;
};
