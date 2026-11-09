import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { getOwnerSummary } from './services';
import type { OwnerSummary, OwnerSummaryParams } from './types';

export const OWNER_SUMMARY_QUERIES = {
    all: ['owner-summary'] as const,
    summary: (params: OwnerSummaryParams) => ['owner-summary', params.period, params.environment] as const,
};

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
    });
