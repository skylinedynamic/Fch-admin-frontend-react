import { apiClient } from '../../lib/http/apiClient';
import type { OwnerReportSettings, OwnerReportSettingsResponse, OwnerSummaryParams, OwnerSummaryResponse } from './types';

export const OWNER_SUMMARY_ENDPOINT = '/common/owner-summary';
export const OWNER_REPORT_SETTINGS_ENDPOINT = `${OWNER_SUMMARY_ENDPOINT}/report-settings`;

export const getOwnerSummary = async (params: OwnerSummaryParams): Promise<OwnerSummaryResponse> => {
    const response = await apiClient.get<OwnerSummaryResponse>(OWNER_SUMMARY_ENDPOINT, { params });
    return response.data;
};

export const getOwnerReportSettings = async (): Promise<OwnerReportSettingsResponse> => {
    const response = await apiClient.get<OwnerReportSettingsResponse>(OWNER_REPORT_SETTINGS_ENDPOINT);
    return response.data;
};

export const updateOwnerReportSettings = async (settings: OwnerReportSettings): Promise<OwnerReportSettingsResponse> => {
    const response = await apiClient.put<OwnerReportSettingsResponse>(OWNER_REPORT_SETTINGS_ENDPOINT, settings);
    return response.data;
};
