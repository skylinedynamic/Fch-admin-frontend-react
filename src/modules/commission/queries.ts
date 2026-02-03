import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { getCommissions } from './services';
import { CommissionFilters } from './types';

export const useCommissions = (filters: CommissionFilters) => {
    return useQuery({
        queryKey: ['commissions', filters],
        queryFn: () => getCommissions(filters),
        placeholderData: keepPreviousData, 
        staleTime: 5000, 
    });
};
