import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import {
    fetchClients,
    fetchClientById,
    fetchBorrowerBusinessFinancials,
    createClient,
    updateClient,
    updateBusinessFinancials,
    deleteClient,
    deleteClients,
    archiveClients,
    unarchiveClients,
    fetchClientChecklist,
    saveClientChecklist,
    fetchBorrowerProfileStats,
    fetchBorrowerTiers,
    fetchBorrowerPlans,
    fetchBorrowerTierWiseTaskList,
    fetchBorrowerProgress,
    updateTaskVerificationStatus,
    fetchCreditProfile,
    fetchClientCapitalAccessOverview,
    fetchClientCapitalAccessStrategies
} from './services';
import type { BorrowerTier, BorrowerProgress } from './types';
import { fetchAllBorrowers, getAllUsers } from '../borrower/services';
import { fetchPartners } from '../partner/services';
import type { Client, ClientFilterParams } from './types';

// Query Keys
export const clientKeys = {
    all: ['clients'] as const,
    lists: () => [...clientKeys.all, 'list'] as const,
    list: (params: ClientFilterParams) => [...clientKeys.lists(), params] as const,
    details: () => [...clientKeys.all, 'detail'] as const,
    detail: (id: string | number) => [...clientKeys.details(), id] as const,
    checklist: (id: string | number) => [...clientKeys.detail(id), 'checklist'] as const,
    stats: (id: string | number) => [...clientKeys.detail(id), 'stats'] as const,
    creditProfile: (id: string | number) => [...clientKeys.detail(id), 'creditProfile'] as const,
    capitalAccess: (id: string | number) => [...clientKeys.detail(id), 'capitalAccess'] as const,
    capitalAccessStrategies: (id: string | number) => [...clientKeys.detail(id), 'capitalAccessStrategies'] as const,
    businessFinancials: (id: string | number) => [...clientKeys.detail(id), 'businessFinancials'] as const,
    listStats: (partnerId?: string | number) => [...clientKeys.lists(), 'stats', partnerId] as const,
    partners: () => ['partners'] as const,
    users: () => ['users'] as const,
    tiers: () => ['tiers'] as const,
    plans: () => ['plans', 'host'] as const,
    nonHostPlans: () => ['plans', 'non-host'] as const,
    tierTasks: (id: string | number) => [...clientKeys.detail(id), 'tierTasks'] as const,
    progress: (id: string | number) => [...clientKeys.detail(id), 'progress'] as const,
};

// Hooks
export const useClients = (params: ClientFilterParams) => {
    return useQuery({
        queryKey: clientKeys.list(params),
        queryFn: () => fetchAllBorrowers(params),
        placeholderData: keepPreviousData,
    });
};

export const useClient = (id: string | number, enabled: boolean = true) => {
    return useQuery({
        queryKey: clientKeys.detail(id),
        queryFn: () => fetchClientById(id),
        enabled: enabled && !!id,
    });
};

// Fetch only Business Financials tab fields via dedicated endpoint
export const useBusinessFinancials = (id: string | number, enabled: boolean = true) => {
    return useQuery({
        queryKey: clientKeys.businessFinancials(id),
        queryFn: () => fetchBorrowerBusinessFinancials(id),
        enabled: enabled && !!id,
    });
};

export const useCreateClient = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createClient,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: clientKeys.lists() });
        },
    });
};

export const useUpdateClient = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string | number; data: Partial<Client> }) => updateClient(id, data),
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: clientKeys.detail(variables.id) });
            queryClient.invalidateQueries({ queryKey: clientKeys.lists() });
        },
    });
};


export const useUpdateBusinessFinancials = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string | number; data: Partial<Client> }) => updateBusinessFinancials(id, data),
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: clientKeys.businessFinancials(variables.id) });
            queryClient.invalidateQueries({ queryKey: clientKeys.lists() });
        },
    });
};

export const useDeleteClient = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: deleteClient,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: clientKeys.lists() });
        },
    });
};

export const useDeleteClients = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: deleteClients,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: clientKeys.lists() });
        },
    });
};

/**
 * Archiving takes a client out of the working list without deleting anything -
 * the record, its history and its access are untouched, and a search still finds
 * it. Both invalidate the list so the row moves in or out immediately.
 */
export const useArchiveClients = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: archiveClients,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: clientKeys.lists() });
        },
    });
};

export const useUnarchiveClients = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: unarchiveClients,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: clientKeys.lists() });
        },
    });
};

export const useClientChecklist = (id: string | number, enabled: boolean = true) => {
    return useQuery({
        queryKey: clientKeys.checklist(id),
        queryFn: () => fetchClientChecklist(id),
        enabled: enabled && !!id,
    });
};

export const useSaveClientChecklist = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, checkedIds }: { id: string | number; checkedIds: number[] }) => saveClientChecklist(id, checkedIds),
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: clientKeys.checklist(variables.id) });
        },
    });
};

export const useClientProfileStats = (id: string | number, enabled: boolean = true) => {
    return useQuery({
        queryKey: clientKeys.stats(id),
        queryFn: () => fetchBorrowerProfileStats(id),
        enabled: enabled && !!id,
    });
};

export const useClientCreditProfile = (id: string | number, enabled: boolean = true) => {
    return useQuery({
        queryKey: clientKeys.creditProfile(id),
        queryFn: () => fetchCreditProfile(id),
        enabled: enabled && !!id,
    });
};

export const useClientCapitalAccessOverview = (id: string | number, enabled: boolean = true) => {
    return useQuery({
        queryKey: clientKeys.capitalAccess(id),
        queryFn: () => fetchClientCapitalAccessOverview(id),
        enabled: enabled && !!id,
    });
};

export const useClientCapitalAccessStrategies = (id: string | number, enabled: boolean = true) => {
    return useQuery({
        queryKey: clientKeys.capitalAccessStrategies(id),
        queryFn: () => fetchClientCapitalAccessStrategies(id),
        enabled: enabled && !!id,
    });
};


export const usePartners = (enabled: boolean = true) => {
    return useQuery({
        queryKey: clientKeys.partners(),
        queryFn: async () => {
            const result = await fetchPartners();
            return result.status ? (result.data || []).map((partner: any) => ({
                id: partner.id,
                full_name: partner.full_name,
                company_name: partner.company_name,
                displayLabel: `${partner.full_name} (${partner.company_name})`
            })) : [];
        },
        enabled,
        staleTime: 5 * 60 * 1000,
    });
};

export const useAllUsers = () => {
    return useQuery({
        queryKey: clientKeys.users(),
        queryFn: async () => {
            const result = await getAllUsers();
            return result.status ? (result.data || []).map((user: any) => ({
                id: user.id,
                full_name: user.name,
                displayLabel: `${user.name}`
            })) : [];
        },
        staleTime: 5 * 60 * 1000,
    });
};

export const useBorrowerTiers = () => {
    return useQuery({
        queryKey: clientKeys.tiers(),
        queryFn: async () => {
            const result = await fetchBorrowerTiers();
            return (result.status && result.data) ? (result.data || []).map((tier: any) => ({
                label: tier.name,
                value: tier.name
            })) : [];
        },
        staleTime: 5 * 60 * 1000,
    });
};

export const useBorrowerPlans = (enabled: boolean = true) => {
    return useQuery({
        queryKey: clientKeys.plans(),
        queryFn: async () => {
            const result = await fetchBorrowerPlans();
            return (result.status && result.data) ? result.data : [];
        },
        staleTime: 5 * 60 * 1000,
        enabled
    });
};


export const useBorrowerTierWiseTaskList = (borrowerId: string | number, enabled: boolean = true) => {
    return useQuery<BorrowerTier[]>({
        queryKey: clientKeys.tierTasks(borrowerId),
        queryFn: async () => {
            const result = await fetchBorrowerTierWiseTaskList(borrowerId);
            return (result.status && result.data) ? result.data : [];
        },
        enabled: enabled && !!borrowerId,
    });
};
export const useBorrowerProgress = (borrowerId: string | number, enabled: boolean = true) => {
    return useQuery<BorrowerProgress>({
        queryKey: clientKeys.progress(borrowerId),
        queryFn: async () => {
            const result = await fetchBorrowerProgress(borrowerId);
            // Default to empty arrays/objects if null
            return (result.status && result.data) ? result.data : {} as BorrowerProgress;
        },
        enabled: enabled && !!borrowerId,
    });
};

export const useUpdateTaskVerificationStatus = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updateTaskVerificationStatus,
        onSuccess: (data, variables) => {
            if (variables.borrower_id) {
                queryClient.invalidateQueries({ queryKey: clientKeys.tierTasks(variables.borrower_id) });
                queryClient.invalidateQueries({ queryKey: clientKeys.progress(variables.borrower_id) });
            }
        },
    });
};
