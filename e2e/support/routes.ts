/**
 * Every top-level screen of the admin panel with the guard that App.jsx puts
 * in front of it. This is the oracle for the persona access matrix: given a
 * signed-in user, `expectedOutcome` says where the router must send them.
 *
 * Keep it in step with src/App.jsx - a route added there without an entry
 * here is simply not checked.
 */
export type Guard =
  | { kind: 'none' }
  /** PermissionRoute: any one of the permissions is enough. */
  | { kind: 'permission'; any: string[] }
  /** HostRoute: is_host only. */
  | { kind: 'host' }
  /** PartnerHostRoute: is_host AND the partner account itself (not an employee). */
  | { kind: 'partnerHost' }
  /** NonHostPartnerRoute: a non-host partner account with a first payment date. */
  | { kind: 'nonHostPartner' }

export type RouteCheck = {
  name: string
  path: string
  guard: Guard
  /** The list/read call the screen makes, used to check the API agrees with the UI. */
  api?: { method: 'GET' | 'POST'; path: string; body?: unknown }
}

const perm = (...any: string[]): Guard => ({ kind: 'permission', any })

export const ROUTES: RouteCheck[] = [
  { name: 'Dashboard', path: '/', guard: { kind: 'none' }, api: { method: 'GET', path: '/common/dashboard' } },
  { name: 'Profile', path: '/profile', guard: { kind: 'none' } },
  { name: 'Notifications', path: '/notifications', guard: { kind: 'none' }, api: { method: 'GET', path: '/common/notifications' } },

  { name: 'Reminders', path: '/reminders', guard: perm('view reminders'), api: { method: 'POST', path: '/common/reminders/fetch-reminders', body: { page: 1, per_page: 5 } } },
  { name: 'Commissions', path: '/commissions', guard: perm('view commission'), api: { method: 'POST', path: '/common/commissions', body: { page: 1, per_page: 5 } } },
  { name: 'Partners', path: '/partners', guard: perm('view partners'), api: { method: 'POST', path: '/admin/partners/fetch-partners', body: { page: 1, per_page: 5 } } },
  { name: 'Partner create', path: '/partners/create', guard: perm('create partners') },
  { name: 'Employees', path: '/employees', guard: perm('view employees'), api: { method: 'POST', path: '/common/employees/fetch-employees', body: { page: 1, per_page: 5 } } },
  { name: 'Employee create', path: '/employees/create', guard: perm('create employees') },
  { name: 'Clients', path: '/clients', guard: perm('view clients'), api: { method: 'POST', path: '/common/borrowers/fetch-all-borrowers', body: { page: 1, per_page: 5 } } },
  { name: 'Client create', path: '/clients/create', guard: perm('create clients') },
  { name: 'Users', path: '/users', guard: perm('view users'), api: { method: 'POST', path: '/common/users/fetch-users', body: { page: 1, per_page: 5 } } },
  { name: 'User create', path: '/users/create', guard: perm('create users') },
  { name: 'Roles & permissions', path: '/roles-permissions', guard: perm('view roles & permissions'), api: { method: 'GET', path: '/common/roles' } },
  { name: 'Role create', path: '/roles-permissions/create', guard: perm('view roles & permissions') },

  { name: 'Blogs', path: '/cms/blogs', guard: perm('view blogs'), api: { method: 'POST', path: '/admin/cms/blogs/fetch', body: { page: 1, per_page: 5 } } },
  { name: 'Blog categories', path: '/cms/blog-categories', guard: perm('view blogs'), api: { method: 'GET', path: '/admin/cms/blog-categories' } },
  { name: 'Blog tags', path: '/cms/blog-tags', guard: perm('view blogs'), api: { method: 'GET', path: '/admin/cms/blog-tags' } },
  { name: 'SEO settings', path: '/cms/seo-settings', guard: perm('view seo settings'), api: { method: 'POST', path: '/admin/cms/seo-settings', body: { page: 1, per_page: 5 } } },
  { name: 'Site settings', path: '/cms/site-settings', guard: perm('view site settings'), api: { method: 'GET', path: '/admin/cms/site-settings' } },

  { name: 'Settings', path: '/settings', guard: perm('update payment settings', 'update partner agreement settings', 'update borrower agreement settings', 'update email configuration settings', 'update sms configuration settings', 'update branding settings', 'update domain configuration settings', 'update microbilt settings') },

  { name: 'Tiers', path: '/tiers', guard: { kind: 'host' }, api: { method: 'POST', path: '/admin/credit-builder/tiers/fetch-tiers', body: { page: 1, per_page: 5 } } },
  { name: 'Credit accounts', path: '/credit-accounts', guard: { kind: 'host' }, api: { method: 'POST', path: '/admin/credit-builder/credit-accounts/fetch-accounts', body: { page: 1, per_page: 5 } } },
  { name: 'Capital access', path: '/capital-access', guard: { kind: 'host' }, api: { method: 'POST', path: '/common/capital-accesses/fetch-all', body: { page: 1, per_page: 5 } } },
  { name: 'Verification center', path: '/verification-center', guard: { kind: 'host' }, api: { method: 'POST', path: '/common/credit-builder/verification-center-fetch-all', body: { page: 1, per_page: 5 } } },
  { name: 'Funding sequences', path: '/funding', guard: { kind: 'host' }, api: { method: 'POST', path: '/common/funding-sequencings/fetch', body: { page: 1, per_page: 5 } } },
  { name: 'Lenders', path: '/lenders', guard: { kind: 'host' }, api: { method: 'GET', path: '/admin/lenders?page=1&per_page=5' } },
  { name: 'Credit profile requests', path: '/intake-review/credit-profile-requests', guard: { kind: 'host' }, api: { method: 'POST', path: '/admin/credit-profile-requests', body: { page: 1, per_page: 5 } } },

  { name: 'Payment gateways', path: '/payment-methods', guard: { kind: 'partnerHost' }, api: { method: 'GET', path: '/admin/payment-methods' } },
  { name: 'Plan & fee', path: '/plan-and-fee', guard: { kind: 'partnerHost' }, api: { method: 'POST', path: '/admin/plan-fee/fetch-subscription-plans', body: {} } },

  { name: 'Appointments', path: '/appointments', guard: perm('view appointments'), api: { method: 'POST', path: '/common/appointments/fetch-all' } },
  { name: 'Contacts', path: '/contacts', guard: perm('view contacts'), api: { method: 'POST', path: '/common/contacts/fetch-contacts', body: { page: 1, per_page: 5 } } },
  { name: 'Contact create', path: '/contacts/create', guard: perm('create contacts') },
  { name: 'Leads', path: '/leads', guard: perm('view leads'), api: { method: 'POST', path: '/common/leads/fetch-leads', body: { page: 1, per_page: 5 } } },
  { name: 'Lead create', path: '/leads/create', guard: perm('create leads') },

  { name: 'Pre-qualification', path: '/intake-review/pre-qualification', guard: perm('view pre qualification'), api: { method: 'POST', path: '/common/request-application/pre-qualification', body: { page: 1, per_page: 5 } } },
  { name: 'Funding applications', path: '/intake-review/funding-application', guard: perm('view funding application'), api: { method: 'POST', path: '/common/request-application/funding-application', body: { page: 1, per_page: 5 } } },
  { name: 'Funding requests', path: '/intake-review/funding-request', guard: perm('view funding request'), api: { method: 'POST', path: '/common/funding-request', body: { page: 1, per_page: 5 } } },
  { name: 'Change requests', path: '/intake-review/change-requests', guard: perm('view change requests'), api: { method: 'POST', path: '/admin/change-requests', body: { page: 1, per_page: 5 } } },

  { name: 'Invoices', path: '/invoices', guard: perm('view invoices'), api: { method: 'POST', path: '/common/invoices/fetch-invoices', body: { page: 1, per_page: 5 } } },
  { name: 'Payments', path: '/payments', guard: perm('view payments'), api: { method: 'POST', path: '/common/payments/fetch-payments', body: { page: 1, per_page: 5 } } },
  { name: 'Subscriptions', path: '/subscriptions', guard: perm('view subscriptions'), api: { method: 'POST', path: '/common/subscriptions/fetch-all', body: { page: 1, per_page: 5 } } },
  { name: 'Upcoming billing', path: '/billing', guard: perm('view subscriptions'), api: { method: 'POST', path: '/common/billing/fetch-upcoming', body: { page: 1, per_page: 5 } } },
  { name: 'My subscription', path: '/my-subscription', guard: { kind: 'nonHostPartner' }, api: { method: 'GET', path: '/common/my-subscription' } },

  { name: 'Resources', path: '/resources', guard: perm('view resources'), api: { method: 'GET', path: '/common/resources' } },
  { name: 'Manage resources', path: '/manage-resources', guard: perm('create resources', 'update resources', 'delete resources') },
  { name: 'Resource create', path: '/resources/create', guard: perm('create resources') },
  { name: 'Embed form settings', path: '/embed-form/settings', guard: perm('view configuration'), api: { method: 'GET', path: '/common/embed-forms/config' } },
  { name: 'Loan applications', path: '/embed-form/loan-applications', guard: perm('view application'), api: { method: 'POST', path: '/common/embed-forms/submissions/fetch', body: { page: 1, per_page: 5 } } },
]

/** The part of the persisted auth store the guards read. */
export type SessionUser = {
  is_host?: boolean | number
  entity_type?: string
  first_payment_date?: string | null
  permissions?: string[]
}

export type SessionSubscription = {
  is_host?: boolean | number
  is_free_trail?: boolean
  free_trail_end_date?: string | null
  subscription_status?: string | null
  subscription_end_date?: string | null
} | null

/** Mirrors src/lib/auth/subscriptionUtils.ts isSubscriptionRestricted(). */
export function isRestricted(sub: SessionSubscription): boolean {
  if (!sub || sub.is_host) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const toDate = (value?: string | null) => (value ? new Date(`${String(value).slice(0, 10)}T00:00:00`) : null)

  if (sub.is_free_trail) {
    const end = toDate(sub.free_trail_end_date)
    return Boolean(end && today > end)
  }
  const status = String(sub.subscription_status || '').toLowerCase().trim()
  if (status && !['active', 'cancelled', 'completed'].includes(status)) return true
  const end = toDate(sub.subscription_end_date)
  return Boolean(end && today > end)
}

export type Outcome = 'allowed' | 'access-denied' | 'home'

/** Where App.jsx must send this user for this route. */
export function expectedOutcome(route: RouteCheck, user: SessionUser, sub: SessionSubscription): Outcome {
  const host = user.is_host === true || user.is_host === 1
  const partnerAccount = user.entity_type === 'Partner'

  switch (route.guard.kind) {
    case 'none':
      return 'allowed'
    case 'host':
      return host ? 'allowed' : 'home'
    case 'partnerHost':
      return host && partnerAccount ? 'allowed' : 'home'
    case 'nonHostPartner':
      return !host && partnerAccount && Boolean(user.first_payment_date) ? 'allowed' : 'home'
    case 'permission': {
      const has = route.guard.any.some((p) => (user.permissions || []).includes(p))
      const restricted = isRestricted(sub)
      // A restricted (unpaid / expired) account may still reach invoices and payments.
      const allowedWhenRestricted = route.guard.any.some((p) => ['view dashboard', 'view invoices', 'view payments'].includes(p))
      if (has && (!restricted || allowedWhenRestricted)) return 'allowed'
      return restricted ? 'home' : 'access-denied'
    }
  }
}
