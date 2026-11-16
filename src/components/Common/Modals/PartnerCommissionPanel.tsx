import type { PartnerCommissionSetup } from '../../../modules/application/types'
import { tierForPosition, tierRangeLabel } from '../../../modules/partner/tiers'
import { PARTNER_COMMISSION_TYPE } from '../../../config/partnerCommission'

interface PartnerCommissionPanelProps {
  setup: PartnerCommissionSetup
}

const formatRate = (value: number | string | null | undefined) => `${+Number(value ?? 0).toFixed(2)}%`

/** "$500", or "$1,250.50" when there are cents. */
const formatAmount = (value: number | string | null | undefined) => {
  const n = Number(value ?? 0)
  const digits = Number.isInteger(n) ? 0 : 2
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: digits, maximumFractionDigits: digits })
}

// The split can't be typed: with no tier for the deal the partner gets none.
const ADMIN_KEEPS_IT = 'so the admin keeps the whole success fee.'

/**
 * The Closed (Completed) modal's Partner Commission strip: the partner's rate
 * for this deal - the Funding tier (Partner profile › Commissions) its number
 * falls in, which sets the Partner Commission Rate - or "Not set", when the
 * admin keeps the whole success fee. A Flat Amount tier shows its $.
 */
export default function PartnerCommissionPanel({ setup }: PartnerCommissionPanelProps) {
  const { tiers, deal_position: position } = setup
  const index = tierForPosition(tiers, position)
  const tier = index >= 0 ? tiers[index] : null
  const flat = tier?.commission_type === PARTNER_COMMISSION_TYPE.FLAT

  const detail = tiers.length === 0
    ? `No commission is set for this partner, ${ADMIN_KEEPS_IT}`
    : tier
      ? `Deal #${position} · ${tierRangeLabel(tier)} deals tier`
      : `No commission is set for deal #${position} (past the last tier), ${ADMIN_KEEPS_IT}`

  return (
    <section className={`fam-partner ${tier ? '' : 'fam-partner--unset'}`} aria-labelledby="fam-partner-title">
      <span className="fam-icon" aria-hidden="true"><i className="ri-shake-hands-line"></i></span>
      <div className="fam-partner__text">
        <h6 className="fam-partner__title" id="fam-partner-title">Partner Commission</h6>
        <p className="fam-partner__detail" data-testid="partner-commission-deal">{detail}</p>
      </div>
      {tier ? (
        <div className="fam-partner__rate" data-testid="partner-commission-rate">
          <b>{flat ? formatAmount(tier.amount) : formatRate(tier.percentage)}</b>
          <small>{flat ? 'flat per deal' : 'of success fee'}</small>
        </div>
      ) : (
        <span className="fam-partner__status">Not set</span>
      )}
    </section>
  )
}
