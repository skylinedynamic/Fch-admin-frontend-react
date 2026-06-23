import { useQuery } from '@tanstack/react-query';
import { fetchCreditProfileRequests, fetchCreditProfileRequestDetails } from './services';

const QUERY_KEY = 'credit-profile-requests';

export const useCreditProfileRequests = (params: any) => {
    return useQuery({
        queryKey: [QUERY_KEY, params],
        queryFn: () => fetchCreditProfileRequests(params),
    });
};

export const useCreditProfileRequestDetails = (id: number | string, enabled: boolean = true) => {
    return useQuery({
        queryKey: [QUERY_KEY, 'detail', id],
        queryFn: () => fetchCreditProfileRequestDetails(id),
        enabled: enabled && !!id,
    });
};
