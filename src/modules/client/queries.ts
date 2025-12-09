import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    fetchClients,
    fetchClientById,
    createClient,
    updateClient,
    deleteClient,
    deleteClients
} from './services';
import type { Client, ClientFilterParams } from './types';

// Query Keys
export const clientKeys = {
    all: ['clients'] as const,
    lists: () => [...clientKeys.all, 'list'] as const,
    list: (params: ClientFilterParams) => [...clientKeys.lists(), params] as const,
    details: () => [...clientKeys.all, 'detail'] as const,
    detail: (id: string | number) => [...clientKeys.details(), id] as const,
};

// Hooks
export const useClients = (params: ClientFilterParams) => {
    return useQuery({
        queryKey: clientKeys.list(params),
        queryFn: () => fetchClients(params),
        placeholderData: (previousData: any) => previousData,
    });
};

export const useClient = (id: string | number, enabled: boolean = true) => {
    return useQuery({
        queryKey: clientKeys.detail(id),
        queryFn: () => fetchClientById(id),
        enabled: enabled && !!id,
    });
};

export const useCreateClient = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createClient,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: clientKeys.lists() });
        },
    });
};

export const useUpdateClient = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string | number; data: Partial<Client> }) => updateClient(id, data),
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: clientKeys.detail(variables.id) });
            queryClient.invalidateQueries({ queryKey: clientKeys.lists() });
        },
    });
};

export const useDeleteClient = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: deleteClient,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: clientKeys.lists() });
        },
    });
};

export const useDeleteClients = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: deleteClients,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: clientKeys.lists() });
        },
    });
};
