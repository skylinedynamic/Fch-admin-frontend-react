import { apiClient } from '../../lib/http/apiClient';
import {
  PaginatedApiResponse,
  SingleApiResponse,
  PreQualificationApplication,
  FundingApplication,
  PreQualificationApplicationDetails,
  FundingApplicationDetails,
  ApplicationStatistics
} from './types';

export const getPreQualificationApplications = async (payload: any = {}): Promise<PaginatedApiResponse<PreQualificationApplication>> => {
  const response = await apiClient.post('/common/request-application/pre-qualification', payload);
  return response.data;
};

export const getFundingApplications = async (payload: any = {}): Promise<PaginatedApiResponse<FundingApplication>> => {
  const response = await apiClient.post('/common/request-application/funding-application', payload);
  return response.data;
};

export const getPreQualificationApplicationDetails = async (id: string | number): Promise<SingleApiResponse<PreQualificationApplicationDetails>> => {
  const response = await apiClient.get(`/common/request-application/pre-qualification/${id}`);
  return response.data;
};

export const updateApplicationStatus = async (payload: { id: number | string; status: string; status_note?: string }): Promise<SingleApiResponse<any>> => {
  const response = await apiClient.post('/common/request-application/pre-qualification/status-update', payload);
  return response.data;
};

export const runAiPreQualification = async (id: string | number): Promise<SingleApiResponse<{ application: PreQualificationApplicationDetails }>> => {
  const response = await apiClient.post(`/common/request-application/pre-qualification/${id}/run-ai`);
  return response.data;
};

export const getFundingApplicationDetails = async (id: string | number): Promise<SingleApiResponse<FundingApplicationDetails>> => {
  const response = await apiClient.get(`/common/request-application/funding-application/${id}`);
  return response.data;
};

export const updateFundingApplicationStatus = async (payload: { funding_application_id: number | string; status: string; status_note?: string; funded_amount?: string | number }): Promise<SingleApiResponse<any>> => {
  const response = await apiClient.post('/common/request-application/funding-application/status-update', payload);
  return response.data;
};

export const getFundingApplicationStats = async (): Promise<SingleApiResponse<ApplicationStatistics>> => {
  const response = await apiClient.get('/common/request-application/funding-application/card-summary');
  return response.data;
};

export const getPreQualificationStats = async (): Promise<SingleApiResponse<ApplicationStatistics>> => {
  const response = await apiClient.get('/common/request-application/pre-qualification/card-summary');
  return response.data;
};

export const saveFundingApplicationCommission = async (payload: { funding_application_id: number | string; total_commission: number; admin_commission: string | number | null; partner_commission: string | number | null; requested_amount?: number | string | null }): Promise<SingleApiResponse<any>> => {
  const response = await apiClient.post('/admin/funding-application/save-commission', payload);
  return response.data;
};

export const getFundingRequests = async (payload: any = {}): Promise<PaginatedApiResponse<any>> => {
  const response = await apiClient.post('/common/funding-request', payload);
  return response.data;
};

export const getFundingRequestDetails = async (id: string | number): Promise<SingleApiResponse<any>> => {
  const response = await apiClient.get(`/common/funding-request/${id}`);
  return response.data;
};

export const updateFundingRequestStatus = async (payload: { id: number | string; status: string; reject_reason?: string }): Promise<SingleApiResponse<any>> => {
  const response = await apiClient.post('/common/funding-request/status-update', payload);
  return response.data;
};

export const assignLenderToFundingRequest = async (payload: { id: number | string; lender_ids: number[] }): Promise<SingleApiResponse<any>> => {
  const response = await apiClient.post('/common/funding-request/assign-lender', payload);
  return response.data;
};

export const downloadFundingApplication = async (id: string | number, password?: string): Promise<void> => {
  const urlPath = `/common/request-application/funding-application/${id}/download-application` + (password ? `?password=${encodeURIComponent(password)}` : '');
  const response = await apiClient.get(urlPath, {
    responseType: 'blob'
  });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  const contentDisposition = response.headers['content-disposition'];
  let fileName = `Funding_Application_${id}.pdf`;
  if (contentDisposition) {
    const fileNameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
    if (fileNameMatch && fileNameMatch.length === 2) {
      fileName = fileNameMatch[1];
    }
  }
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

export const downloadFundingSignature = async (id: string | number, password?: string): Promise<void> => {
  const urlPath = `/common/request-application/funding-application/${id}/download-signature` + (password ? `?password=${encodeURIComponent(password)}` : '');
  const response = await apiClient.get(urlPath, {
    responseType: 'blob'
  });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  const contentDisposition = response.headers['content-disposition'];
  let fileName = `Signature_Certificate_${id}.pdf`;
  if (contentDisposition) {
    const fileNameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
    if (fileNameMatch && fileNameMatch.length === 2) {
      fileName = fileNameMatch[1];
    }
  }
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

/** One uploaded file of a funding application, as a blob (for an in-place download). */
export const downloadFundingApplicationDocument = async (documentId: string | number): Promise<any> => {
  return apiClient.get(`/common/funding-application/documents/${Number(documentId)}/download`, {
    responseType: 'blob'
  });
};

export const downloadFundingZip = async (id: string | number, password?: string): Promise<void> => {
  const urlPath = `/common/request-application/funding-application/${id}/download-zip` + (password ? `?password=${encodeURIComponent(password)}` : '');
  const response = await apiClient.get(urlPath, {
    responseType: 'blob'
  });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  const contentDisposition = response.headers['content-disposition'];
  let fileName = `Funding_Documents_${id}.zip`;
  if (contentDisposition) {
    const fileNameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
    if (fileNameMatch && fileNameMatch.length === 2) {
      fileName = fileNameMatch[1];
    }
  }
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

export const downloadHistoryFile = async (historyId: string | number, defaultFileName?: string): Promise<void> => {
  const urlPath = `/common/request-application/download-history/${historyId}/download`;
  const response = await apiClient.get(urlPath, {
    responseType: 'blob'
  });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  const contentDisposition = response.headers['content-disposition'];
  let fileName = defaultFileName || `Download_${historyId}.pdf`;
  if (contentDisposition) {
    const fileNameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
    if (fileNameMatch && fileNameMatch.length === 2) {
      fileName = fileNameMatch[1];
    }
  }
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

export const getFundingApplicationAuditHistory = async (id: string, params?: any): Promise<any> => {
  const { data } = await apiClient.post(`/common/request-application/funding-application/${id}/audit-history`, params);
  return data;
};
