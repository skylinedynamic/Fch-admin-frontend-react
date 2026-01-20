import { apiClient } from '../../lib/http/apiClient';

export const getPreQualificationApplications = async (payload: any = {}) => {
  const response = await apiClient.post('/common/request-application/pre-qualification', payload);
  return response.data;
};

export const getFundingApplications = async (payload: any = {}) => {
  const response = await apiClient.post('/common/request-application/funding-application', payload);
  return response.data;
};
