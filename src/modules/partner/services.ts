import { apiClient } from '../../lib/http/apiClient';
import type { Partner, TenantConfig } from './types';

export const fetchPartners = async (payload: any = {}) => {
  const response = await apiClient.post('/admin/partners/fetch-partners', payload);
  return response.data;
};

export const getPartner = async (id: string | number): Promise<Partner> => {
  const { data } = await apiClient.get(`/admin/partners-details/${id}`);
  return data;
};

export const fetchPartnerById = getPartner;

export const createPartner = async (payload: Partial<Partner> | FormData): Promise<Partner> => {
  const config = payload instanceof FormData
    ? { headers: { 'Content-Type': 'multipart/form-data' } }
    : {};
  const { data } = await apiClient.post('/admin/partners', payload, config);
  return data;
};

export const updatePartner = async (id: string | number, payload: Partial<Partner> | FormData): Promise<Partner> => {
  if (payload instanceof FormData) {
    payload.append('_method', 'PUT');
    const config = { headers: { 'Content-Type': 'multipart/form-data' } };
    const { data } = await apiClient.post(`/admin/partners/${id}`, payload, config);
    return data;
  } else {
    const { data } = await apiClient.put(`/admin/partners/${id}`, payload);
    return data;
  }
}

export const deletePartner = async (id: string | number): Promise<void> => {
  await apiClient.delete(`/admin/partners/${id}`);
};

export const allUsers = async (): Promise<any> => {
  const { data } = await apiClient.post('common/get-all-users ', {});
  return data;
};

export const fetchBorrowers = async (payload: any = {}) => {
  const { data } = await apiClient.post('/admin/partners/fetch-borrowers', payload);
  return data;
};

export const fetchPartnerDocuments = async (partnerId: string | number) => {
  const { data } = await apiClient.post('/admin/partners/fetch-all-documents', { partner_id: partnerId });
  return data;
};

export const downloadPartnerDocument = async (docId: string | number) => {
  const response = await apiClient.get(`/admin/partners/documents/download/${docId}`, {
    responseType: 'blob', // Important for file downloads
  });
  return response;
};

export const uploadPartnerDocument = async (partnerId: string | number, formData: FormData) => {
  const { data } = await apiClient.post(`/admin/partners/documents`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return data;
};

export const attachPartnerDocuments = async (payload: { partner_id: string | number, file_path: string[] | string, document_type?: string, entity_type?: string, entity_id?: string | number }) => {
  const { data } = await apiClient.post(`/admin/partners/documents`, payload);
  return data;
};

export const deletePartnerDocument = async (docId: string | number) => {
  const { data } = await apiClient.post(`/admin/partners/documents/delete/${docId}`);
  return data;
};

export const getSubscription = async (partnerId: string | number) => {
  const { data } = await apiClient.post(`/admin/partner-subscriptions/${partnerId}`);
  return data;
};

export const deletePartners = async (ids: Array<number | string>) => {
  const res = await apiClient.post('/admin/partners/multiple-delete', { ids });
  return res.data;
};

export const saveSubscription = async (payload: any) => {
  const { data } = await apiClient.post('/admin/partners/subscription', payload);
  return data;
};

export const fetchSubscriptions = async (partnerId: string | number, payload: any = {}) => {
  const { data } = await apiClient.post(`/admin/partners/fetch-subscriptions/${partnerId}`, payload);
  return data;
};

export const fetchAllSubscriptions = async (partnerId: string | number, payload: any = {}) => {
  const { data } = await apiClient.post(`/admin/partners/fetch-all-subscriptions`, { ...payload, partner_id: partnerId });
  return data;
};

export const fetchGlobalSubscriptions = async (payload: any = {}) => {
  const { data } = await apiClient.post(`/admin/partners/fetch-all-subscriptions`, payload);
  return data;
};

export const fetchUpcomingBilling = async (payload: any = {}) => {
  const { data } = await apiClient.post('/common/billing/fetch-upcoming', payload);
  return data;
};

export const fetchBillingDetails = async (id: string | number) => {
  const { data } = await apiClient.get(`/common/billing/${id}`);
  return data;
};

export const fetchSubscriptionStats = async () => {
  const { data } = await apiClient.post('/admin/partners/subscriptions-stats');
  return data;
};

export const fetchPartnerStats = async () => {
  const { data } = await apiClient.post('/admin/partners-stats', {});
  return data;
};

export const fetchPartnerProfileStats = async (id: string) => {
  const { data } = await apiClient.post(`/admin/partners-profile-states-details-count/${id}`, {});
  return data;
};

export const getNextPartnerId = async () => {
  const { data } = await apiClient.get('/admin/partners/next-id');
  return data;
};

export const fetchPartnerPlans = async () => {
  const { data } = await apiClient.get('/common/partner-plans');
  return data;
};

export const getTenantConfig = async (id: string | number): Promise<TenantConfig> => {
  const { data } = await apiClient.get(`/admin/partners/tenant-config/${id}`);
  return data;
};

export const updateTenantConfig = async (id: string | number, payload: Partial<TenantConfig>): Promise<Partner> => {
  const { data } = await apiClient.post(`/admin/partners/tenant-config/${id}`, payload);
  return data;
};

// Common Tenant Config for Partners
export const getMyTenantConfig = async (): Promise<TenantConfig> => {
  const { data } = await apiClient.get('/common/partner/tenant-config');
  return data;
};

export const updateMyTenantConfig = async (payload: Partial<TenantConfig>): Promise<Partner> => {
  const { data } = await apiClient.post('/common/partner/tenant-config', payload);
  return data;
};

export const getSubscriptionDetails = async (id: string | number) => {
  const { data } = await apiClient.get(`/admin/partners/subscription/${id}`);
  return data;
};


