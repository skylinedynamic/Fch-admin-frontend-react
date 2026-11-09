import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { getOwnerReportSettings, getOwnerSummary, updateOwnerReportSettings } from './services';
import type { OwnerReportSettings, OwnerSummary, OwnerSummaryParams } from './types';

export const OWNER_SUMMARY_QUERIES = {
    all: ['owner-summary'] as const,
    summary: (params: OwnerSummaryParams) =>
        ['owner-summary', params.period, params.from ?? null, params.to ?? null, params.environment ?? null] as const,
    reportSettings: ['owner-summary', 'report-settings'] as const,
};

const HTTP_UNPROCESSABLE = 422;
const FAILED_REQUEST_RETRIES = 1;

/** A response that does not carry a summary (an older API, a proxy page) is an error, not an empty screen. */
export class OwnerSummaryShapeError extends Error {
    constructor() {
        super('The owner summary response did not contain a summary.');
        this.name = 'OwnerSummaryShapeError';
    }
}

const isOwnerSummary = (value: unknown): value is OwnerSummary =>
    typeof value === 'object' && value !== null && 'kpis' in value && 'attention' in value;

/** The host owner's summary for a period; the last one stays on screen while the next loads. */
export const useOwnerSummary = (params: OwnerSummaryParams) =>
    useQuery<OwnerSummary>({
        queryKey: OWNER_SUMMARY_QUERIES.summary(params),
        queryFn: async () => {
            const { data } = await getOwnerSummary(params);
            if (!isOwnerSummary(data)) {
                throw new OwnerSummaryShapeError();
            }
            return data;
        },
        placeholderData: keepPreviousData,
        // A refused range will be refused again; anything else may be a blip.
        retry: (failures, error) =>
            !(isAxiosError(error) && error.response?.status === HTTP_UNPROCESSABLE) && failures < FAILED_REQUEST_RETRIES,
    });

/** Who gets the weekly report. Only fetched once the dialog is open. */
export const useOwnerReportSettings = (enabled: boolean) =>
    useQuery<OwnerReportSettings>({
        queryKey: OWNER_SUMMARY_QUERIES.reportSettings,
        queryFn: async () => (await getOwnerReportSettings()).data,
        enabled,
    });

export const useUpdateOwnerReportSettings = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: updateOwnerReportSettings,
        onSuccess: ({ data }) => queryClient.setQueryData(OWNER_SUMMARY_QUERIES.reportSettings, data),
    });
};
