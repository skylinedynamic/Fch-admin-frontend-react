import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchChangeRequests, revealChangeRequest, updateChangeRequestStatus } from './services';
import { UpdateChangeRequestPayload } from './types';

const QUERY_KEY = 'change-requests';

export const useChangeRequests = (params: any) => {
    return useQuery({
        queryKey: [QUERY_KEY, params],
        queryFn: () => fetchChangeRequests(params),
    });
};

/** Fetches an SSN or EIN change's two numbers in full (BUG-014); logged by the API. */
export const useRevealChangeRequest = () =>
    useMutation({
        mutationFn: (id: number | string) => revealChangeRequest(id),
    });

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
