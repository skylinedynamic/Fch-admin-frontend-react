import { apiClient } from '../../lib/http/apiClient';
import type { Partner } from './types';

export const fetchPartners = async (payload: any = {}) => {
  const response = await apiClient.post('/admin/partners/fetch-partners', payload);
  return response.data;
};

export const createPartner = async (payload: Partial<Partner>): Promise<Partner> => {
  const { data } = await apiClient.post('/partners', payload);
  return data;
};

export const updatePartner = async (id: string | number, payload: Partial<Partner>): Promise<Partner> => {
  const { data } = await apiClient.put(`/partners/${id}`, payload);
  return data;
};

export const deletePartner = async (id: string | number): Promise<void> => {
  await apiClient.delete(`/partners/${id}`);
};

export const allUsers = async (): Promise<any> => {
  const { data } = await apiClient.post('/admin/partners/get-all-users', {});
  return data;
};