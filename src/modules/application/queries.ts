import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../lib/query/queryKeys';
import { getPreQualificationApplications } from './services';

export const usePreQualificationApplications = (params: any = {}) => {
  return useQuery({
    queryKey: [...queryKeys.application.list(), params],
    queryFn: () => getPreQualificationApplications(params),
    placeholderData: (previousData) => previousData, // Keep previous data while fetching new data
  });
};
