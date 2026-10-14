import { apiClient } from '../../lib/http/apiClient';

export const fetchMySubscriptionDetails = async () => {
  const { data } = await apiClient.get('/common/my-subscription');
  return data;
};

export const fetchMySubscriptionPaymentProviders = async () => {
  const { data } = await apiClient.get('/payment/get-payment-methods');
  return data;
};

export const updateMySubscriptionDefaultPaymentMethod = async (payload: { provider_name: string; payment_method_id?: string }) => {
  const { data } = await apiClient.post('/common/my-subscription/update-payment-method', payload);
  return data;
};

/** Takes the default payment method off; nothing is auto-charged until one is set again. */
export const removeMySubscriptionDefaultPaymentMethod = async () => {
  const { data } = await apiClient.post('/common/my-subscription/remove-default-payment-method');
  return data;
};

export const cancelMySubscription = async () => {
  const { data } = await apiClient.post('/common/my-subscription/cancel-subscription');
  return data;
};
