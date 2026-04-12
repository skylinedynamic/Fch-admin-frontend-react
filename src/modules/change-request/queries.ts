import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchChangeRequests, updateChangeRequestStatus } from './services';
import { UpdateChangeRequestPayload } from './types';

const QUERY_KEY = 'change-requests';

export const useChangeRequests = (params: any) => {
    return useQuery({
        queryKey: [QUERY_KEY, params],
        queryFn: () => fetchChangeRequests(params),
    });
};

export const useUpdateChangeRequestStatus = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, payload }: { id: number | string; payload: UpdateChangeRequestPayload }) =>
            updateChangeRequestStatus(id, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
        },
    });
};
