import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../lib/query/queryKeys';
import { GPT_STATUS } from './types';
import { getPreQualificationApplications, getFundingApplications, getPreQualificationApplicationDetails, updateApplicationStatus, runAiPreQualification, updateFundingApplicationStatus, getFundingApplicationDetails, getFundingApplicationStats, getPreQualificationStats, saveFundingApplicationCommission, getFundingRequests, getFundingRequestDetails, updateFundingRequestStatus, assignLenderToFundingRequest, getFundingApplicationAuditHistory } from './services';

export const usePreQualificationApplications = (params: any = {}) => {
  return useQuery({
    queryKey: [...queryKeys.application.list(), 'pre-qualification', params],
    queryFn: () => getPreQualificationApplications(params),
    placeholderData: (previousData) => previousData, // Keep previous data while fetching new data
  });
};


export const useFundingApplications = (params: any = {}) => {
  return useQuery({
    queryKey: [...queryKeys.application.list(), 'funding', params],
    queryFn: () => getFundingApplications(params),
    placeholderData: (previousData) => previousData,
  });
};

// How often the details are re-fetched while an AI evaluation runs server-side.
const AI_RUN_POLL_INTERVAL_MS = 5000;

export const usePreQualificationApplicationDetails = (id: string | number) => {
  return useQuery({
    queryKey: queryKeys.application.detail(id),
    queryFn: () => getPreQualificationApplicationDetails(id),
    enabled: !!id,
    // The evaluation runs after run-ai has responded, so the result only
    // arrives by re-fetching until gpt_status leaves PENDING.
    refetchInterval: (query) => {
      const data: any = query.state.data;
      const app = data?.data || data;
      return app?.gpt_status === GPT_STATUS.PENDING ? AI_RUN_POLL_INTERVAL_MS : false;
    },
  });
};

export const useFundingApplicationDetails = (id: string | number) => {
  return useQuery({
    queryKey: queryKeys.application.detail(id),
    queryFn: () => getFundingApplicationDetails(id),
    enabled: !!id,
  });
};

export const useFundingApplicationAuditHistory = (id: string, params: any = {}) => {
  return useQuery({
    queryKey: [...queryKeys.application.detail(id), 'audit-history', params],
    queryFn: () => getFundingApplicationAuditHistory(id, params),
    enabled: !!id,
    placeholderData: (previousData) => previousData,
  });
};

export const useUpdateApplicationStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateApplicationStatus,
    onSuccess: (data, variables) => {
        // Invalidate list and details
        queryClient.invalidateQueries({ queryKey: queryKeys.application.all });
    },
  });
};

export const useRunAiPreQualification = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string | number) => runAiPreQualification(id),
    onSuccess: (data, id) => {
      // The response already holds the application as PENDING. Writing it to the
      // cache starts the details polling at once, without waiting on a re-fetch.
      const application = (data as any)?.data?.application;
      if (application) {
        queryClient.setQueryData(queryKeys.application.detail(id), (old: any) => (old ? { ...old, data: application } : old));
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.application.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.application.all });
    },
  });
};

export const useUpdateFundingApplicationStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateFundingApplicationStatus,
    onSuccess: (data, variables) => {
        // Invalidate list and details
        queryClient.invalidateQueries({ queryKey: queryKeys.application.all });
    },
  });
};

export const useFundingApplicationStats = () => {
    return useQuery({
        queryKey: [...queryKeys.application.all, 'funding', ...queryKeys.application.summary],
        queryFn: getFundingApplicationStats,
    });
};

export const usePreQualificationStats = () => {
    return useQuery({
        queryKey: [...queryKeys.application.all, 'pre-qualification', ...queryKeys.application.summary],
        queryFn: getPreQualificationStats,
    });
};

export const useSaveFundingApplicationCommission = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: saveFundingApplicationCommission,
    onSuccess: (data, variables) => {
        queryClient.invalidateQueries({ queryKey: queryKeys.application.detail(variables.funding_application_id) });
        queryClient.invalidateQueries({ queryKey: queryKeys.application.all });
    },
  });
};

export const useFundingRequests = (params: any = {}) => {
  return useQuery({
    queryKey: [...queryKeys.application.list(), 'funding-requests', params],
    queryFn: () => getFundingRequests(params),
    placeholderData: (previousData) => previousData,
  });
};

export const useFundingRequestDetails = (id: string | number) => {
  return useQuery({
    queryKey: queryKeys.application.detail(id),
    queryFn: () => getFundingRequestDetails(id),
    enabled: !!id,
  });
};

export const useUpdateFundingRequestStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateFundingRequestStatus,
    onSuccess: (data, variables) => {
        queryClient.invalidateQueries({ queryKey: queryKeys.application.detail(variables.id) });
        queryClient.invalidateQueries({ queryKey: queryKeys.application.all });
    },
  });
};

export const useAssignLenderToFundingRequest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: assignLenderToFundingRequest,
    onSuccess: (data, variables) => {
        queryClient.invalidateQueries({ queryKey: queryKeys.application.detail(variables.id) });
    },
  });
};
