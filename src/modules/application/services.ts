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

export const getFundingApplicationDetails = async (id: string | number): Promise<SingleApiResponse<FundingApplicationDetails>> => {
  const response = await apiClient.get(`/common/request-application/funding-application/${id}`);
  return response.data;
};

export const updateFundingApplicationStatus = async (payload: { id: number | string; status: string; status_note?: string }): Promise<SingleApiResponse<any>> => {
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
