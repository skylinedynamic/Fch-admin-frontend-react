import { apiClient } from '../../lib/http/apiClient';

export const fetchMySubscriptionDetails = async () => {
  const { data } = await apiClient.get('/common/my-subscription');
  return data;
};

export const fetchMySubscriptionPaymentProviders = async () => {
  const { data } = await apiClient.get('/common/partner-payment-providers');
  return data;
};

export const updateMySubscriptionDefaultPaymentMethod = async (payload: { provider_name: string; payment_method_id?: string }) => {
  const { data } = await apiClient.post('/common/my-subscription/update-payment-method', payload);
  return data;
};

export const cancelMySubscription = async () => {
  const { data } = await apiClient.post('/common/my-subscription/cancel-subscription');
  return data;
};
