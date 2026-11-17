/**
 * Partner profile › Commissions: the host sets a partner's Funding commission
 * tiers - its share (%) of the success fee by how many of its clients' funding
 * applications have been funded (0-10, 11-20, 21 and up). The funding
 * application's commission split (the Closed (Completed) modal) opens at the
 * tier for that deal until a split is saved (fch-api PUT /admin/partners/{id}/commission).
 */

/** The partner profile tab id. */
export const PARTNER_COMMISSION_TAB = 'commissions';

/** Partner profile › Commissions, for a link that opens a partner on the tab. */
export const partnerCommissionPath = (partnerId: number | string) => `/partners/${partnerId}?tab=${PARTNER_COMMISSION_TAB}`;

/** Seeing commission settings (as on the funding application's Commission card). */
export const COMMISSION_VIEW_PERMISSION = 'view commission';

/** Changing them - the API route requires it (fch-api CommissionViewer::MANAGE_PERMISSION). */
export const COMMISSION_MANAGE_PERMISSION = 'update commission';

/**
 * The range the API accepts (fch-api Partner::COMMISSION_MIN/MAX): the split
 * keeps at least 1% of the success fee for the admin, so 99% at most.
 */
export const PARTNER_COMMISSION_MIN = 0;
export const PARTNER_COMMISSION_MAX = 99;


/** The tab's form, submitted by the page header's Save Commission button. */
export const PARTNER_COMMISSION_FORM_ID = 'partner-commission-form';

/** The success fee the Commissions tab's summary splits, as an example. */
export const PARTNER_COMMISSION_EXAMPLE_FEE = 10000;

/**
 * How a tier is paid - each tier has its own type (fch-api
 * PartnerCommissionTier::TYPE_*): a share (%) of the success fee, or a flat
 * amount ($) per deal.
 */
export const PARTNER_COMMISSION_TYPE = {
  PERCENTAGE: 'percentage',
  FLAT: 'flat',
} as const;

export type PartnerCommissionType = (typeof PARTNER_COMMISSION_TYPE)[keyof typeof PARTNER_COMMISSION_TYPE];

/** A tier's Type dropdown. */
export const PARTNER_COMMISSION_TYPE_OPTIONS: ReadonlyArray<{ value: PartnerCommissionType; label: string }> = [
  { value: PARTNER_COMMISSION_TYPE.PERCENTAGE, label: 'Percentage' },
  { value: PARTNER_COMMISSION_TYPE.FLAT, label: 'Flat Amount' },
];

/** The range of a flat amount the API accepts (fch-api PartnerCommissionTier::AMOUNT_MIN/MAX). */
export const PARTNER_COMMISSION_AMOUNT_MIN = 0;
export const PARTNER_COMMISSION_AMOUNT_MAX = 99999999.99;
