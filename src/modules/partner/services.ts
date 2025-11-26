import { apiClient } from '../../lib/http/apiClient';
import type { Partner } from './types';

export const fetchPartners = async (payload: any = {}) => {
  const response = await apiClient.post('/admin/partners/fetch-partners', payload);
  return response.data;
};

export const getPartner = async (id: string | number): Promise<Partner> => {
  const { data } = await apiClient.get(`/admin/partners/${id}`);
  return data;
};

export const createPartner = async (payload: Partial<Partner> | FormData): Promise<Partner> => {
  const config = payload instanceof FormData
    ? { headers: { 'Content-Type': 'multipart/form-data' } }
    : {};
  const { data } = await apiClient.post('/admin/partners', payload, config);
  return data;
};

export const updatePartner = async (id: string | number, payload: Partial<Partner> | FormData): Promise<Partner> => {
  const config = payload instanceof FormData
    ? { headers: { 'Content-Type': 'multipart/form-data' } }
    : {};
  const { data } = await apiClient.put(`/admin/partners/${id}`, payload, config);
  return data;
};

export const deletePartner = async (id: string | number): Promise<void> => {
  await apiClient.delete(`/admin/partners/${id}`);
};

export const allUsers = async (): Promise<any> => {
  const { data } = await apiClient.post('/admin/partners/get-all-users', {});
  return data;
};