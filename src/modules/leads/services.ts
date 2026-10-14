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

export const createLeadDetails = async (payload: Partial<Lead>): Promise<any> => {
  const response = await apiClient.post('/common/leads/details', payload);
  return response.data;
};

export const updateLeadDetails = async (id: string | number, payload: Partial<Lead>): Promise<any> => {
  const response = await apiClient.post(`/common/leads/${id}/details`, payload);
  return response.data;
};

export const updateLeadContactInfo = async (id: string | number, payload: Partial<Lead>): Promise<any> => {
  const response = await apiClient.post(`/common/leads/${id}/contact-info`, payload);
  return response.data;
};

/**
 * Deletes one lead or many in one call - the API's only lead delete. Leads not
 * in the caller's book are skipped.
 */
export const deleteLeads = async (ids: Array<string | number>): Promise<any> => {
  const response = await apiClient.post('/common/leads/multiple-delete', { ids });
  return response.data;
};

export const convertLead = async (id: string | number, payload: any = {}): Promise<any> => {
  const response = await apiClient.post(`/common/leads/${id}/convert`, payload);
  return response.data;
};

export const fetchGlobalStats = async (payload: any = {}) => {
  const response = await apiClient.post('/common/stats', payload);
  return response.data;
};

export const processPayment = async (payload: any) => {
  const response = await apiClient.post('/process-payment', payload);
  return response.data;
};


