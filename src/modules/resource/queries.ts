import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../lib/query/queryKeys';
import {
    fetchGroupedResources,
    fetchResourcesByType,
    fetchResourceById,
    createResource,
    updateResource,
    deleteResource
} from './services';
import type { ResourceFormData } from './types';

// Update queryKeys if you have a local or global one. Assuming we create one right here:
export const resourceKeys = {
    all: ['resources'] as const,
    grouped: () => [...resourceKeys.all, 'grouped'] as const,
    list: (type: string) => [...resourceKeys.all, 'list', type] as const,
    detail: (id: number | string) => [...resourceKeys.all, 'detail', id] as const,
};

export const useGroupedResources = () => {
    return useQuery({
        queryKey: resourceKeys.grouped(),
        queryFn: fetchGroupedResources,
    });
};

export const useResourcesByType = (type: string) => {
    return useQuery({
        queryKey: resourceKeys.list(type),
        queryFn: () => fetchResourcesByType(type),
        enabled: !!type,
    });
};

export const useResource = (id: number | string | undefined) => {
    return useQuery({
        queryKey: resourceKeys.detail(id || ''),
        queryFn: () => fetchResourceById(id!),
        enabled: !!id,
    });
};

export const useCreateResource = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: ResourceFormData) => createResource(data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: resourceKeys.all });
        },
    });
};

export const useUpdateResource = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: number | string, data: ResourceFormData }) => updateResource(id, data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: resourceKeys.all });
        },
    });
};

export const useDeleteResource = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: number | string) => deleteResource(id),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: resourceKeys.all });
        },
    });
};
