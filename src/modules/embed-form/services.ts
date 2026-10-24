import { apiClient } from '../../lib/http/apiClient';
import type { ConversionPreview } from './types';

export const getEmbedFormConfig = async (partnerId?: number) => {
  const params = partnerId ? { partner_id: partnerId } : {};
  const response = await apiClient.get('/common/embed-forms/config', { params });
  return response.data;
};

export const updateEmbedFormConfig = async (payload: {
  form_title?: string;
  allowed_domains?: string[];
  notification_email?: string;
  is_active?: boolean;
}) => {
  const response = await apiClient.put('/common/embed-forms/config', payload);
  return response.data;
};

export const regenerateEmbedKey = async () => {
  const response = await apiClient.post('/common/embed-forms/config/generate-key');
  return response.data;
};

export const fetchEmbedFormSubmissions = async (payload: any = {}) => {
  const response = await apiClient.post('/common/embed-forms/submissions/fetch', payload);
  return response.data;
};

export const getEmbedFormSubmission = async (id: number | string) => {
  const response = await apiClient.get(`/common/embed-forms/submissions/${id}`);
  return response.data;
};

export const updateEmbedFormSubmissionStatus = async (id: number | string, status: string) => {
  const response = await apiClient.put(`/common/embed-forms/submissions/${id}/status`, { status });
  return response.data;
};

export const downloadEmbedFormAttachment = async (id: number | string) => {
  const response = await apiClient.get(`/common/embed-forms/attachments/${id}/download`, {
    responseType: 'blob',
  });
  return response;
};

/** Whether converting would use an existing client or create a new one. Writes nothing. */
export const fetchConversionPreview = async (id: number | string): Promise<ConversionPreview> => {
  const response = await apiClient.get(`/common/embed-forms/submissions/${id}/conversion-preview`);
  return response.data.data;
};

export const convertEmbedFormSubmissionToBorrower = async (id: number | string, payload: any = {}) => {
  const response = await apiClient.post(`/common/embed-forms/submissions/${id}/convert-to-borrower`, payload);
  return response.data;
};

