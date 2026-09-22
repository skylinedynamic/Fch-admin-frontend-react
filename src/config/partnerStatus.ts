/**
 * Partner Status Options Configuration
 *
 * The status vocabularies a partner row can be described by, plus the list-screen
 * filter dropdowns composed from them. Each value is a contract with the API -
 * sent verbatim as a query filter and what the server matches on - so changing a
 * value changes behaviour.
 *
 * A status is declared once here and every filter is built from that list rather
 * than re-typing its values, so adding a status reaches the dropdown without
 * anyone remembering to update a literal.
 *
 * The borrower-side equivalents live in borrower.ts.
 */

export interface PartnerStatusOption {
    label: string;
    value: string;
}

/** Prefixed to a status list so the filter can be cleared from the dropdown. */
export const ALL_STATUS_OPTION: PartnerStatusOption = { label: 'All Status', value: '' };

/* -------------------------------------------------------------------------
   Partner status - the value the Status column shows.
   Mirrors Partner::STATUS on the API.
   ------------------------------------------------------------------------- */

export const PARTNER_STATUS: PartnerStatusOption[] = [
    { label: 'Active', value: 'Active' },
    { label: 'Inactive', value: 'Inactive' },
    { label: 'Suspended', value: 'Suspended' },
    { label: 'OnBoarding', value: 'OnBoarding' },
];

export const PARTNER_STATUS_FILTER_OPTIONS: PartnerStatusOption[] = [
    ALL_STATUS_OPTION,
    ...PARTNER_STATUS,
];

/* -------------------------------------------------------------------------
   Trial status - mirrors Partner::TRIAL_STATUS on the API.

   These are statuses, not column values: TRIAL and REGULAR are resolved from the
   is_free_trail flag and EXPIRED additionally from the trial end date, all in
   Partner::scopeTrialFilter. EXPIRED is a subset of TRIAL rather than a sibling -
   a partner whose trial ran out is still on a trial plan.

   Labels mirror the Trial badge in the list column (badgeHelper's
   getTrialBadgeConfig), so filtering by a status shows the rows carrying it.
   ------------------------------------------------------------------------- */

export const TRIAL_STATUS_TRIAL = 'Trial';
export const TRIAL_STATUS_EXPIRED = 'Expired';
export const TRIAL_STATUS_REGULAR = 'Regular';

export const TRIAL_STATUS: PartnerStatusOption[] = [
    { label: 'Trial Only', value: TRIAL_STATUS_TRIAL },
    { label: 'Trial Expired', value: TRIAL_STATUS_EXPIRED },
    { label: 'Regular Only', value: TRIAL_STATUS_REGULAR },
];

export const TRIAL_FILTER_OPTIONS: PartnerStatusOption[] = [
    { label: 'All Trials', value: '' },
    ...TRIAL_STATUS,
];

/* -------------------------------------------------------------------------
   Archive state. Shared by the Partners and Clients lists.

   ARCHIVE_ACTIVE is the working list with archived rows hidden, ARCHIVE_ONLY
   narrows to them, and ARCHIVE_ALL ignores the distinction. A search overrides
   all three server-side, so an archived record is always findable by name or
   email.

   No "all" sentinel is prefixed to the filter: every option is a real state, and
   the empty value already means the working list.
   ------------------------------------------------------------------------- */

export const ARCHIVE_ACTIVE = '';
export const ARCHIVE_ONLY = '1';
export const ARCHIVE_ALL = 'all';

export const ARCHIVE_STATUS: PartnerStatusOption[] = [
    { label: 'Active Only', value: ARCHIVE_ACTIVE },
    { label: 'Archived Only', value: ARCHIVE_ONLY },
    { label: 'All Records', value: ARCHIVE_ALL },
];

export const ARCHIVE_FILTER_OPTIONS: PartnerStatusOption[] = [...ARCHIVE_STATUS];
