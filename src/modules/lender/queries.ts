import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { getLenders, getLender, createLender, updateLender, deleteLender } from './services';
import { LenderFilterParams, Lender } from './types';

export const useLenders = (filters: LenderFilterParams) => {
    return useQuery({
        queryKey: ['lenders', filters],
        queryFn: () => getLenders(filters),
        placeholderData: keepPreviousData,
        staleTime: 5000,
    });
};

export const useLender = (id: string | number | undefined) => {
    return useQuery({
        queryKey: ['lender', id],
        queryFn: () => getLender(id!),
        enabled: !!id,
    });
};

export const useCreateLender = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (payload: Lender) => createLender(payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['lenders'] });
        },
    });
};

export const useUpdateLender = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, payload }: { id: string | number; payload: Lender }) => updateLender(id, payload),
        onSuccess: (_, { id }) => {
            queryClient.invalidateQueries({ queryKey: ['lender', String(id)] });
            queryClient.invalidateQueries({ queryKey: ['lenders'] });
        },
    });
};

export const useDeleteLender = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string | number) => deleteLender(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['lenders'] });
        },
    });
};
