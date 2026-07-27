import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../lib/query/queryKeys';
import { getPreQualificationApplications, getFundingApplications, getPreQualificationApplicationDetails, updateApplicationStatus, updateFundingApplicationStatus, getFundingApplicationDetails, getFundingApplicationStats, getPreQualificationStats, saveFundingApplicationCommission, getFundingRequests, getFundingRequestDetails, updateFundingRequestStatus, assignLenderToFundingRequest, getFundingApplicationAuditHistory } from './services';

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

export const usePreQualificationApplicationDetails = (id: string | number) => {
  return useQuery({
    queryKey: queryKeys.application.detail(id),
    queryFn: () => getPreQualificationApplicationDetails(id),
    enabled: !!id,
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
