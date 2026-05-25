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