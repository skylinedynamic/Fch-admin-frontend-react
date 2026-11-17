import { apiClient } from '../../lib/http/apiClient';
import type { OwnerReportSettings, OwnerReportSettingsResponse, OwnerSummaryExportFile, OwnerSummaryExportParams, OwnerSummaryParams, OwnerSummaryResponse } from './types';

export const OWNER_SUMMARY_ENDPOINT = '/common/owner-summary';
export const OWNER_REPORT_SETTINGS_ENDPOINT = `${OWNER_SUMMARY_ENDPOINT}/report-settings`;
export const OWNER_SUMMARY_EXPORT_ENDPOINT = `${OWNER_SUMMARY_ENDPOINT}/export`;

const FILENAME_IN_DISPOSITION = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i;

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

/** Business Insights › Export PDF: the summary or details report for the screen's period and payments. */
export const exportOwnerSummaryPdf = async (params: OwnerSummaryExportParams): Promise<OwnerSummaryExportFile> => {
    const response = await apiClient.get<Blob>(OWNER_SUMMARY_EXPORT_ENDPOINT, { params, responseType: 'blob' });
    const disposition = String(response.headers?.['content-disposition'] ?? '');
    const named = FILENAME_IN_DISPOSITION.exec(disposition)?.[1];

    return {
        blob: response.data,
        filename: named ? decodeURIComponent(named.trim()) : `business-insights-${params.type}.pdf`,
    };
};
