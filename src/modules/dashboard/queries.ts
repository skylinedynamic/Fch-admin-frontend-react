import { useQuery } from '@tanstack/react-query';
import { getDashboardData } from './services';

export const DASHBOARD_QUERIES = {
    data: ['dashboard', 'data'],
};

export const useDashboardData = () => {
    return useQuery({
        queryKey: DASHBOARD_QUERIES.data,
        queryFn: getDashboardData,
    });
};
