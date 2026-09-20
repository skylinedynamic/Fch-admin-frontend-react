import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { getCommissions, getCommissionById, processPayout } from './services';
import { CommissionFilters, ProcessPayoutPayload } from './types';

export const useCommissions = (filters: CommissionFilters) => {
    return useQuery({
        queryKey: ['commissions', filters],
        queryFn: () => getCommissions(filters),
        placeholderData: keepPreviousData,
        staleTime: 5000,
    });
};

export const useCommission = (id: string | number | undefined) => {
    return useQuery({
        queryKey: ['commission', id],
        queryFn: () => getCommissionById(id!),
        enabled: !!id,
    });
};

export const useProcessPayout = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, payload }: { id: string | number; payload: ProcessPayoutPayload }) => processPayout(id, payload),
        onSuccess: (_, { id }) => {
            queryClient.invalidateQueries({ queryKey: ['commission', String(id)] });
            queryClient.invalidateQueries({ queryKey: ['commissions'] });
        },
    });
};
