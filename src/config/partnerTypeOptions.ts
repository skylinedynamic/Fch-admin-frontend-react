/**
 * Partner Type Options Configuration
 *
 * Defines the available partner types and client type labels
 */

export const SUBSCRIPTION_PARTNER_TYPES = {
  REFERRAL: "Referral",
  FOUNDING: "Founding Partner",
  EXECUTIVE: "Executive Partner (White-Label)",
};

export const PARTNER_TYPES = {
  CERTIFIED: "Certified Partner",
  WHITE_LABEL: "White-Label Partner (WL)",
};

/**
 * Partner types that process and edit their own borrowers' funding
 * applications (the host edits everyone's). White-label and certified
 * partners have the same rights here.
 */
export const PARTNER_EDITOR_TYPES: string[] = [PARTNER_TYPES.WHITE_LABEL, PARTNER_TYPES.CERTIFIED];

export const CLIENT_TYPE_LABELS = {
  CERTIFIED: "Certified Partner Client",
  WHITE_LABEL: "White-Label Partner Client",
};

import { SUBSCRIPTION_STATUS_TYPES, SUBSCRIPTION_STATUS_OPTIONS } from './subscriptionConfig';

export { SUBSCRIPTION_STATUS_TYPES, SUBSCRIPTION_STATUS_OPTIONS };
