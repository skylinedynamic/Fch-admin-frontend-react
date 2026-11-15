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
 * min_count..max_count (inclusive; null max = "and up") the partner's share
 * of the success fee is `percentage`.
 */
export interface PartnerCommissionTier {
  id?: number;
  min_count: number | null;
  max_count: number | null;
  percentage: number | null;
}

/** PUT /admin/partners/{id}/commission: the partner's Funding tiers; an empty list clears them. */
export interface PartnerCommissionPayload {
  tiers: PartnerCommissionTier[];
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
