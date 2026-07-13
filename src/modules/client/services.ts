import { apiClient } from '../../lib/http/apiClient';
import type { Client, ClientFilterParams, BorrowerTier, BorrowerProgress } from './types';

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

export const updateBusinessFinancials = async (id: string | number, payload: Partial<Client>): Promise<Client> => {
    const { data } = await apiClient.post(`/common/borrowers/${id}/business-financials`, payload);
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

export const fetchClientFundingOptions = async (borrowerId: string | number, params?: any): Promise<any> => {
    const { data } = await apiClient.get(`/common/funding-sequencings/client-funding-options/${borrowerId}`, { params });
    return data;
};

export const fetchClientReadinessFactors = async (borrowerId: string | number, fundingId: string | number): Promise<any> => {
    const { data } = await apiClient.get(`/common/funding-qualification/client-readiness-factors/${borrowerId}/${fundingId}`);
    return data;
};

// Fetch borrower profile stats details (for detail page)
export const fetchBorrowerProfileStats = async (borrowerId: string | number): Promise<any> => {
    const { data } = await apiClient.post(`/common/borrowers-profile-states-details-count/${borrowerId}`);
    return data;
};

// Fetch borrower documents
export const fetchBorrowerDocuments = async (borrowerId: string | number): Promise<any> => {
    const { data } = await apiClient.post(`/common/borrowers-documents/${Number(borrowerId)}`);
    return data;
};

// Download borrower document
export const downloadBorrowerDocument = async (documentId: string | number): Promise<any> => {
    const response = await apiClient.get(`/common/borrowers-documents/download/${Number(documentId)}`, {
        responseType: 'blob'
    });
    return response;
};

// Attach borrower documents
export const attachBorrowerDocuments = async (payload: { borrower_id: string | number, file_path: string[] | string, document_name?: string[] | string, entity_type?: string, entity_id?: string | number, document_type_id?: number | string }) => {
    const formattedPayload = {
        ...payload,
        borrower_id: Number(payload.borrower_id),
        entity_id: Number(payload.entity_id || payload.borrower_id),
        entity_type: payload.entity_type || 'borrowers',
        document_type_id: payload.document_type_id ? Number(payload.document_type_id) : undefined
    };
    const { data } = await apiClient.post(`/common/borrowers-documents/upload`, formattedPayload);
    return data;
};

// Delete borrower document
export const deleteBorrowerDocument = async (documentId: string | number) => {
    const { data } = await apiClient.post(`/common/borrowers-documents-delete/${Number(documentId)}`);
    return data;
};

// Update borrower document status
export const updateBorrowerDocumentStatus = async (documentId: string | number, status: string, note?: string) => {
    const { data } = await apiClient.post(`/common/borrowers-documents/update-status/${Number(documentId)}`, {
        status,
        rejection_reason: note
    });
    return data;
};

// Fetch borrower document types
export const fetchBorrowerDocumentTypes = async () => {
    const { data } = await apiClient.get(`/common/borrower-document-types`);
    return data;
};

// Fetch all users for borrower module
export const fetchBorrowerUsers = async (): Promise<any> => {
    const { data } = await apiClient.post('/common/get-all-users');
    return data;
};

// Fetch borrower tiers
export const fetchBorrowerTiers = async (): Promise<any> => {
    const { data } = await apiClient.post('/common/tiers/fetch-all-tiers');
    return data;
};

// Fetch borrower plans (for host clients)
export const fetchBorrowerPlans = async (): Promise<any> => {
    const { data } = await apiClient.get('/common/borrower-plans');
    return data;
};

// Fetch non-host borrower plans (for partner clients)
export const fetchNonHostBorrowerPlans = async (): Promise<any> => {
    const { data } = await apiClient.get('/common/non-host-borrower-plans');
    return data;
};

// Fetch borrower tier-wise task list
export const fetchBorrowerTierWiseTaskList = async (borrowerId: string | number): Promise<{ status: boolean, data: BorrowerTier[] }> => {
    const { data } = await apiClient.post(`/admin/credit-builder/tiers/borrowers/tier-wise-tasklist`, { borrower_id: borrowerId });
    return data;
};

// Fetch borrower progress
export const fetchBorrowerProgress = async (borrowerId: string | number): Promise<{ status: boolean, data: BorrowerProgress }> => {
    const { data } = await apiClient.post(`/admin/credit-builder/tiers/borrowers/progress`, { borrower_id: borrowerId });
    return data;
};

// Update task verification status
export const updateTaskVerificationStatus = async (payload: { 
    tasks: { task_id: string | number, migrated_task_id?: string | number | null }[], 
    borrower_id: string | number, 
    tier_id: string | number,
    status: string, 
    note?: string
}) => {
    const { data } = await apiClient.post(`/admin/credit-builder/tasks/update-status`, payload);
    return data;
};

// Parse Credit Profile PDF
export const parseCreditProfilePDF = async (borrowerId: string | number, file: File) => {
    const formData = new FormData();
    formData.append('borrower_id', String(borrowerId));
    formData.append('pdf', file);

    const { data } = await apiClient.post('/common/borrowers/parse-credit-profile', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
    return data;
};

// Save Credit Profile Data
export const saveCreditProfile = async (borrowerId: string | number, profileData: any) => {
    const payload = {
        borrower_id: Number(borrowerId),
        ...profileData
    };
    const { data } = await apiClient.post('/common/borrowers/save-credit-profile', payload);
    return data;
};

// Fetch Credit Profile Data
export const fetchCreditProfile = async (borrowerId: string | number) => {
    const { data } = await apiClient.get(`/common/borrowers/get-credit-profile/${borrowerId}`);
    return data;
};

// Fetch Capital Access Overview for a specific client
export const fetchClientCapitalAccessOverview = async (id: string | number) => {
    const { data } = await apiClient.get(`/common/borrowers/${id}/capital-access-overview`);
    return data;
};

// Fetch Capital Access Strategies for a specific client
export const fetchClientCapitalAccessStrategies = async (id: string | number) => {
    const { data } = await apiClient.get(`/common/borrowers/${id}/capital-access-strategies`);
    return data;
};

