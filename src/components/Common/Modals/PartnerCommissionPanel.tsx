import type { PartnerCommissionSetup } from '../../../modules/application/types'
import { tierForPosition, tierRangeLabel } from '../../../modules/partner/tiers'

interface PartnerCommissionPanelProps {
  setup: PartnerCommissionSetup
}

const formatRate = (value: number | string | null) => `${+Number(value ?? 0).toFixed(2)}%`

const SET_MANUALLY = 'Set the Partner Commission Rate manually below.'

/**
 * The Closed (Completed) modal's Partner Commission strip: the partner's rate
 * for this deal - the Funding tier (Partner profile › Commissions) its number
 * falls in, where the Partner Commission Rate opens - or "Not set", asking
 * for the rate to be set manually.
 */
export default function PartnerCommissionPanel({ setup }: PartnerCommissionPanelProps) {
  const { tiers, deal_position: position } = setup
  const index = tierForPosition(tiers, position)
  const tier = index >= 0 ? tiers[index] : null

  const detail = tiers.length === 0
    ? `No commission is set for this partner. ${SET_MANUALLY}`
    : tier
      ? `Deal #${position} · ${tierRangeLabel(tier)} deals tier`
      : `No commission is set for deal #${position} (past the last tier). ${SET_MANUALLY}`

  return (
    <section className={`fam-partner ${tier ? '' : 'fam-partner--unset'}`} aria-labelledby="fam-partner-title">
      <span className="fam-icon" aria-hidden="true"><i className="ri-shake-hands-line"></i></span>
      <div className="fam-partner__text">
        <h6 className="fam-partner__title" id="fam-partner-title">Partner Commission</h6>
        <p className="fam-partner__detail" data-testid="partner-commission-deal">{detail}</p>
      </div>
      {tier ? (
        <div className="fam-partner__rate" data-testid="partner-commission-rate">
          <b>{formatRate(tier.percentage)}</b>
          <small>of success fee</small>
        </div>
      ) : (
        <span className="fam-partner__status">Not set</span>
      )}
    </section>
  )
}
