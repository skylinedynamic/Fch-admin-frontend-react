import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    fetchCapitalAccounts,
    getCapitalAccount,
    createCapitalAccount,
    updateCapitalAccount,
    deleteCapitalAccount,
    updateCapitalAccountStatus,
    fetchAllCreditAccountsForBuilder,
    StoreCapitalAccessPayload
} from './services';

// Query to fetch all capital access programs
export const useCapitalAccounts = (payload: any = {}) => {
    return useQuery({
        queryKey: ['capital-accesses', payload],
        queryFn: () => fetchCapitalAccounts(payload),
        staleTime: 0,
        gcTime: 0,
    });
};

// Query to get a single capital access program
export const useCapitalAccount = (id: number | string) => {
    return useQuery({
        queryKey: ['capital-access', id],
        queryFn: () => getCapitalAccount(id),
        enabled: !!id,
        staleTime: 0,
        gcTime: 0,
    });
};

// Query to fetch all active credit accounts for the builder
export const useAllCreditAccountsForBuilder = (search?: string) => {
    return useQuery({
        queryKey: ['credit-accounts-builder', search],
        queryFn: () => fetchAllCreditAccountsForBuilder(search),
        staleTime: 0,
        gcTime: 0,
    });
};

// Mutation to create a new capital access program
export const useCreateCapitalAccount = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (payload: StoreCapitalAccessPayload) => createCapitalAccount(payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['capital-accesses'] });
        },
    });
};

// Mutation to update an existing capital access program
export const useUpdateCapitalAccount = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, payload }: { id: number | string; payload: StoreCapitalAccessPayload }) =>
            updateCapitalAccount(id, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['capital-accesses'] });
            queryClient.invalidateQueries({ queryKey: ['capital-access'] });
        },
    });
};

// Mutation to delete a capital access program
export const useDeleteCapitalAccount = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: number | string) => deleteCapitalAccount(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['capital-accesses'] });
        },
    });
};

// Mutation to update status
export const useUpdateCapitalAccountStatus = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, status }: { id: number | string; status: string }) =>
            updateCapitalAccountStatus(id, status),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['capital-accesses'] });
            queryClient.invalidateQueries({ queryKey: ['capital-access'] });
        },
    });
};
