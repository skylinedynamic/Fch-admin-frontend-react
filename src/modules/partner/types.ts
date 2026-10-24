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