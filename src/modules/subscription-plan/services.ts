import { apiClient } from '../../lib/http/apiClient';

export const fetchPlanFeeSubscriptions = async (payload: any = {}) => {
  const { data } = await apiClient.post('/admin/plan-fee/fetch-subscription-plans', payload);
  return data;
};

export const updatePlanFeeSubscription = async (id: string | number, payload: any) => {
  const { data } = await apiClient.put(`/admin/plan-fee/update-subscription-plan/${id}`, payload);
  return data;
};
