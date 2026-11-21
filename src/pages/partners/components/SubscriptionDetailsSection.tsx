import type { ReactNode } from 'react'
import { ENROLLMENT_TYPE_INSTALLMENT, SUBSCRIPTION_STATUS_COLORS } from '../../../config/subscriptionConfig'
import type { PartnerSubscription } from '../../../modules/partner/types'

interface SubscriptionDetailsSectionProps {
  subscriptions: PartnerSubscription[]
}

const EMPTY = '—'

const show = (value: string | null | undefined): string => (value === null || value === undefined || value === '' ? EMPTY : value)

/** Its status in a badge, coloured as on the Subscriptions screens. */
const StatusBadge = ({ status }: { status: string | null }) => {
  if (!status) return <>{EMPTY}</>
  const color = SUBSCRIPTION_STATUS_COLORS[status] ?? 'secondary'
  return <span className={`badge bg-${color}-subtle text-${color} px-3 py-1 rounded-pill fw-medium`}>{status}</span>
}

const Detail = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="col-md-6 col-xl-4">
    <dt className="text-muted fs-13 fw-medium mb-1">{label}</dt>
    <dd className="fs-15 fw-semibold mb-0">{children}</dd>
  </div>
)

/**
 * Partner profile › Subscription: the partner's subscription as its details.
 * A partner has one (fch-api saves it with updateOrCreate on the partner); an
 * older partner left with more than one shows its latest.
 */
export default function SubscriptionDetailsSection({ subscriptions }: SubscriptionDetailsSectionProps) {
  const subscription = subscriptions.reduce<PartnerSubscription | null>((latest, s) => (!latest || s.id > latest.id ? s : latest), null)

  if (!subscription) {
    return <p className="text-muted mb-0 py-3">No subscription found</p>
  }

  // For an installment plan payable_amount is the whole enrollment and
  // total_subscription_amount the balance left after the down payment; a one
  // time payment has no balance (BUG-126).
  const isInstallment = subscription.enrollment_type === ENROLLMENT_TYPE_INSTALLMENT

  return (
    <dl className="row g-4 mb-0 py-2">
      <Detail label="Partner Type">{show(subscription.partner_type)}</Detail>
      <Detail label="Enrollment Type">{show(subscription.enrollment_type)}</Detail>
      <Detail label="Status">
        <StatusBadge status={subscription.status} />
      </Detail>
      <Detail label="Total Amount">{show(subscription.payable_amount)}</Detail>
      {isInstallment && <Detail label="Installment Balance">{show(subscription.total_subscription_amount)}</Detail>}
      <Detail label="Platform Fee">{show(subscription.monthly_platform_fee)}</Detail>
      <Detail label="Start Date">{show(subscription.subscription_start_date)}</Detail>
      <Detail label="End Date">{show(subscription.subscription_end_date)}</Detail>
    </dl>
  )
}
