import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../lib/query/queryKeys';
import { getPreQualificationApplications, getFundingApplications, getPreQualificationApplicationDetails, updateApplicationStatus, updateFundingApplicationStatus, getFundingApplicationDetails, getFundingApplicationStats, getPreQualificationStats, saveFundingApplicationCommission } from './services';

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
        queryClient.invalidateQueries({ queryKey: queryKeys.application.detail(variables.id) });
        queryClient.invalidateQueries({ queryKey: queryKeys.application.all });
    },
  });
};
