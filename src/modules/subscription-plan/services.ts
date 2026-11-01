import { apiClient } from '../../lib/http/apiClient';

export const fetchPlanFeeSubscriptions = async (payload: any = {}) => {
  const { data } = await apiClient.post('/admin/plan-fee/fetch-subscription-plans', payload);
  return data;
};

/**
 * Check a plan's new values with the API's rules, saving nothing - asked before
 * the "Confirm Rate Changes" dialog, so a bad value is refused first (BUG-096).
 */
export const validatePlanFeeSubscription = async (id: string | number, payload: any) => {
  const { data } = await apiClient.put(`/admin/plan-fee/validate-subscription-plan/${id}`, payload);
  return data;
};

export const updatePlanFeeSubscription = async (id: string | number, payload: any) => {
  const { data } = await apiClient.put(`/admin/plan-fee/update-subscription-plan/${id}`, payload);
  return data;
};
