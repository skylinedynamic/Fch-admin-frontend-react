import { apiClient } from '../../lib/http/apiClient';
import type { Lead } from './types';

export const fetchLeads = async (payload: any = {}) => {
  const response = await apiClient.post('/common/leads/fetch-leads', payload);
  return response.data;
};

export const getLead = async (id: string | number): Promise<any> => {
  const response = await apiClient.get(`/common/leads/${id}`);
  return response.data;
};

export const createLead = async (payload: Partial<Lead>): Promise<any> => {
  const response = await apiClient.post('/common/leads', payload);
  return response.data;
};

export const updateLead = async (id: string | number, payload: Partial<Lead>): Promise<any> => {
  const response = await apiClient.put(`/common/leads/${id}`, payload);
  return response.data;
};

export const deleteLead = async (id: string | number): Promise<any> => {
  const response = await apiClient.delete(`/common/leads/${id}`);
  return response.data;
};

export const convertLead = async (id: string | number): Promise<any> => {
  const response = await apiClient.post(`/common/leads/${id}/convert`, {});
  return response.data;
};

export const fetchLeadStats = async () => {
  const response = await apiClient.post('/common/leads-stats', {}); // Assuming this exists based on pattern
  return response.data;
};
