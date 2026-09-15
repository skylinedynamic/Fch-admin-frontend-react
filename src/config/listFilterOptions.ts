/**
 * Dropdown options for the list-screen filters.
 *
 * The values here are a contract with the API, not display strings: each one is
 * sent verbatim as a query filter, so changing a value changes what the server
 * matches on. Kept in config rather than inline in the tables so the Partners and
 * Clients lists cannot drift apart, and so the "all" sentinels appear once.
 */

import { PARTNER_STATUS } from './partnerStatus';

export interface FilterOption {
    label: string;
    value: string;
}

/** Prefixed to a status list so the filter can be cleared from the dropdown. */
export const ALL_STATUS_OPTION: FilterOption = { label: 'All Status', value: '' };

/**
 * Archive state.
 *
 * '' is the working list with archived rows hidden, ARCHIVE_ONLY narrows to them,
 * and ARCHIVE_ALL ignores the distinction. A search overrides all three
 * server-side, so an archived record is always findable by name or email.
 */
export const ARCHIVE_ONLY = '1';
export const ARCHIVE_ALL = 'all';

export const ARCHIVE_FILTER_OPTIONS: FilterOption[] = [
    { label: 'Active Only', value: '' },
    { label: 'Archived Only', value: ARCHIVE_ONLY },
    { label: 'All Records', value: ARCHIVE_ALL },
];

/**
 * The partner's own status — the value the Status column shows, and what
 * Partner::STATUS on the API defines: Active, Inactive, Suspended, OnBoarding.
 *
 * Built from PARTNER_STATUS rather than re-listed, so the filter offers exactly
 * the statuses a partner can hold and a new one appears here automatically.
 */
export const PARTNER_STATUS_FILTER_OPTIONS: FilterOption[] = [
    ALL_STATUS_OPTION,
    ...PARTNER_STATUS,
];

/** Partner free-trial state; '1' / '0' match the is_free_trail boolean column. */
export const TRIAL_FILTER_OPTIONS: FilterOption[] = [
    { label: 'All Trials', value: '' },
    { label: 'Free Trial Only', value: '1' },
    { label: 'Regular Only', value: '0' },
];

/** The borrower-side equivalent, which product words as "Free Plan". */
export const FREE_PLAN_FILTER_OPTIONS: FilterOption[] = [
    { label: 'All Plans', value: '' },
    { label: 'Free Plan', value: '1' },
    { label: 'Regular Plan', value: '0' },
];

