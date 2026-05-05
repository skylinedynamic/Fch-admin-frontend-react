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

// Fetch a single resource by ID
export const fetchResourceById = async (id: number | string): Promise<{ data: ResourceItem }> => {
    const response = await apiClient.get(`/common/resources/${id}`);
    return response.data;
};

// Create a new resource
export const createResource = async (data: ResourceFormData): Promise<{ data: ResourceItem }> => {
    const formData = new FormData();

    Object.entries(data).forEach(([key, val]) => {
        if (val === undefined || val === null) return;

        if (key === 'status' || key === 'is_partner' || key === 'is_borrower') {
            formData.append(key, val ? '1' : '0');
        } else if (Array.isArray(val)) {
            // Handle arrays (overview, impact, providers)
            val.forEach((item, index) => {
                if (typeof item === 'object' && item !== null) {
                    // Handle provider objects
                    Object.entries(item).forEach(([subKey, subVal]) => {
                        if (Array.isArray(subVal)) {
                            // Handle nested arrays like desc_list
                            subVal.forEach((nestedItem, nestedIndex) => {
                                formData.append(`${key}[${index}][${subKey}][${nestedIndex}]`, String(nestedItem ?? ''));
                            });
                        } else if (typeof subVal === 'boolean') {
                            formData.append(`${key}[${index}][${subKey}]`, subVal ? '1' : '0');
                        } else {
                            formData.append(`${key}[${index}][${subKey}]`, String(subVal ?? ''));
                        }
                    });
                } else {
                    // Handle simple arrays (overview, impact)
                    formData.append(`${key}[${index}]`, String(item ?? ''));
                }
            });
        } else {
            formData.append(key, val as string | File);
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

    Object.entries(data).forEach(([key, val]) => {
        if (val === undefined || val === null) return;

        if (key === 'status' || key === 'is_partner' || key === 'is_borrower') {
            formData.append(key, val ? '1' : '0');
        } else if (Array.isArray(val)) {
            val.forEach((item, index) => {
                if (typeof item === 'object' && item !== null) {
                    Object.entries(item).forEach(([subKey, subVal]) => {
                        if (Array.isArray(subVal)) {
                            // Handle nested arrays like desc_list
                            subVal.forEach((nestedItem, nestedIndex) => {
                                formData.append(`${key}[${index}][${subKey}][${nestedIndex}]`, String(nestedItem ?? ''));
                            });
                        } else if (typeof subVal === 'boolean') {
                            formData.append(`${key}[${index}][${subKey}]`, subVal ? '1' : '0');
                        } else {
                            formData.append(`${key}[${index}][${subKey}]`, String(subVal ?? ''));
                        }
                    });
                } else {
                    formData.append(`${key}[${index}]`, String(item ?? ''));
                }
            });
        } else {
            formData.append(key, val as string | File);
        }
    });

    // Add method spoofing for Laravel PUT requests via FormData
    formData.append('_method', 'PUT');

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
