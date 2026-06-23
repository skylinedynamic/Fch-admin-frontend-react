import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { 
    fetchFundingSequencings, 
    getFundingSequencing, 
    createFundingSequencing, 
    updateFundingSequencing, 
    deleteFundingSequencing,
    updateFundingSequencingStatus
} from './services';
import { FundingFilterParams, FundingSequencing } from './types';

export const useFundingSequencings = (filters: FundingFilterParams) => {
    return useQuery({
        queryKey: ['funding_sequencings', filters],
        queryFn: () => fetchFundingSequencings(filters),
        placeholderData: keepPreviousData,
        staleTime: 5000,
    });
};

export const useFundingSequencing = (id: string | number | undefined) => {
    return useQuery({
        queryKey: ['funding_sequencing', id],
        queryFn: () => getFundingSequencing(id!),
        enabled: !!id,
    });
};

export const useCreateFundingSequencing = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (payload: FundingSequencing) => createFundingSequencing(payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['funding_sequencings'] });
        },
    });
};

export const useUpdateFundingSequencing = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, payload }: { id: string | number; payload: FundingSequencing }) => updateFundingSequencing(id, payload),
        onSuccess: (_, { id }) => {
            queryClient.invalidateQueries({ queryKey: ['funding_sequencing', String(id)] });
            queryClient.invalidateQueries({ queryKey: ['funding_sequencings'] });
        },
    });
};

export const useDeleteFundingSequencing = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string | number) => deleteFundingSequencing(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['funding_sequencings'] });
        },
    });
};

export const useUpdateFundingSequencingStatus = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, status }: { id: string | number; status: string }) => updateFundingSequencingStatus(id, status),
        onSuccess: (_, { id }) => {
            queryClient.invalidateQueries({ queryKey: ['funding_sequencing', String(id)] });
            queryClient.invalidateQueries({ queryKey: ['funding_sequencings'] });
        },
    });
};
