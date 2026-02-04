import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { getCommissions, getCommissionById } from './services';
import { CommissionFilters } from './types';

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
