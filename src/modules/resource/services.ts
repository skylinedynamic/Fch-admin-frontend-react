import { apiClient } from '../../lib/http/apiClient';
import type { ResourceItem, GroupedResources, ResourceFormData } from './types';

// Fetch all resources grouped by type
// Uses /common/resources so partners can also access this endpoint
export const fetchGroupedResources = async (): Promise<{ data: GroupedResources }> => {
    const response = await apiClient.get('/common/resources');
    return response.data; // Assumes ApiResponse format
};

// Fetch resources by type
export const fetchResourcesByType = async (type: string): Promise<{ data: ResourceItem[] }> => {
    const response = await apiClient.get(`/admin/resources/type/${type}`);
    return response.data;
};

// Create a new resource
export const createResource = async (data: ResourceFormData): Promise<{ data: ResourceItem }> => {
    const formData = new FormData();
    Object.keys(data).forEach(key => {
        const val = data[key as keyof ResourceFormData];
        if (key === 'status' || key === 'is_partner' || key === 'is_borrower') {
            formData.append(key, val ? '1' : '0');
        } else if (val !== undefined && val !== null) {
            formData.append(key, val as File | string);
        }
    });

    const response = await apiClient.post('/admin/resources', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
};

// Update an existing resource
export const updateResource = async (id: number | string, data: ResourceFormData): Promise<{ data: ResourceItem }> => {
    const formData = new FormData();
    Object.keys(data).forEach(key => {
        const val = data[key as keyof ResourceFormData];
        if (key === 'status' || key === 'is_partner' || key === 'is_borrower') {
            formData.append(key, val ? '1' : '0');
        } else if (val !== undefined && val !== null) {
            formData.append(key, val as File | string);
        }
    });

    // Add method spoofing for Laravel PUT requests via FormData
    formData.append('_method', 'PUT');
    
    // In Laravel, PUT with FormData doesn't handle files well sometimes depending on setup,
    // so using POST and adding _method if needed or just letting controller handle POST /resources/{id}
    const response = await apiClient.post(`/admin/resources/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
};

// Delete a resource
export const deleteResource = async (id: number | string): Promise<void> => {
    await apiClient.delete(`/admin/resources/${id}`);
};

// Download a resource accurately
// Uses /common/resources/download so partners can also download resources
export const downloadResource = async (id: number | string): Promise<any> => {
    return await apiClient.get(`/common/resources/download/${id}`, {
        responseType: 'blob'
    });
};

// Get the next available ID for folder prediction
export const getResourceNextId = async (): Promise<{ next_id: number }> => {
    const response = await apiClient.get('/admin/resources/next-id');
    return response.data;
};
