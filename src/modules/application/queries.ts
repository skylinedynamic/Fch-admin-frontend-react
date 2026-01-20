import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../lib/query/queryKeys';
import { getPreQualificationApplications, getFundingApplications } from './services';

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
