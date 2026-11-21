import type { PartnerCommissionType } from '../../config/partnerCommission';
export type Partner = {
  id: number | string
  name: string
  email?: string
  phone?: string
  status?: string
  [key: string]: unknown
}

export interface SubscriptionStats {
  total_subscriptions: number;
  active_subscriptions: number;
  expiring_soon: number;
  expired_subscriptions: number;
  revenue_this_month: number;
}

/**
 * A partner's subscription as fch-api PartnerDetailsResource sends it
 * (`subscriptions[]`); amounts come formatted. A partner has one - it is saved
 * with updateOrCreate on the partner.
 */
export interface PartnerSubscription {
  id: number;
  partner_type: string | null;
  enrollment_type: string | null;
  /** Installment: the balance left after the down payment. */
  total_subscription_amount: string | null;
  /** The whole enrollment. */
  payable_amount: string | null;
  monthly_platform_fee: string | null;
  subscription_start_date: string | null;
  /** Paid through. */
  subscription_end_date: string | null;
  status: string | null;
}

export interface TenantConfig {
  active_custom_url: boolean;
  partner_domain: string;
  borrower_domain: string;
}

/** A partner in the host's filter dropdowns (fch-api POST common/get-all-partners). */
export interface PartnerOption {
  id: number;
  full_name: string;
  company_name: string | null;
}

/**
 * One Funding commission tier of a partner: for its clients' funded deals
 * min_count..max_count (inclusive; null max = "and up") the partner gets
 * `percentage` of the success fee or a flat `amount` per deal - whichever the
 * tier's commission_type says (missing = percentage); the other is null.
 */
export interface PartnerCommissionTier {
  id?: number;
  min_count: number | null;
  max_count: number | null;
  commission_type?: PartnerCommissionType;
  percentage?: number | null;
  amount?: number | null;
}

/** PUT /admin/partners/{id}/commission: the partner's Funding tiers (at least one), each with its type. */
export interface PartnerCommissionPayload {
  tiers: PartnerCommissionTier[];
}

/**
 * Partner profile › Mail Notification: one notification type (fch-api
 * PartnerNotificationRecipient::TYPES - leads, clients, more later) and the
 * address its emails go to; null sends them to the partner's own email.
 */
export interface PartnerNotificationRecipient {
  type: string;
  label: string;
  help: string;
  email: string | null;
}

/** Type => address to save; null (or empty) goes back to the partner's own email. */
export type PartnerMailNotificationRecipients = Record<string, string | null>;

export interface PartnerMailNotificationResponse {
  status: boolean;
  message?: string;
  data: PartnerNotificationRecipient[];
}

/** The partner's tiers, and how many of its clients' funding applications are funded. */
export interface PartnerCommission {
  id: number;
  commission_tiers: PartnerCommissionTier[];
  funded_deal_count: number;
}

export interface PartnerCommissionResponse {
  status: boolean;
  message: string;
  data: PartnerCommission;
}
