import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchTiers, createTier, updateTier, deleteTier, getTier } from './services';
import { TierFormData } from './types';

export const useTiers = (payload: any = {}) => {
    return useQuery({
        queryKey: ['tiers', payload],
        queryFn: () => fetchTiers(payload),
    });
};

export const useTier = (id: number | string) => {
    return useQuery({
        queryKey: ['tier', id],
        queryFn: () => getTier(id),
        enabled: !!id,
    });
}

export const useCreateTier = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: TierFormData) => createTier(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tiers'] });
        },
    });
};

export const useUpdateTier = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: TierFormData }) => updateTier(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tiers'] });
            queryClient.invalidateQueries({ queryKey: ['tier'] });
        },
    });
};

export const useDeleteTier = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: number) => deleteTier(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tiers'] });
        }
    })
}
