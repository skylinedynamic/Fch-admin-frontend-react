import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { toast } from 'react-toastify'
import { useUpdatePartnerCommission } from '../../../modules/partner'
import type { PartnerCommission, PartnerCommissionTier } from '../../../modules/partner/types'
import { flatCommissionRate, tierCountValue, tierForPosition, tierRangeLabel } from '../../../modules/partner/tiers'
import CommissionTierTable, { tierRowType, tierValueField, type TierRow } from './CommissionTierTable'
import {
  PARTNER_COMMISSION_EXAMPLE_FEE,
  PARTNER_COMMISSION_FORM_ID,
  PARTNER_COMMISSION_MAX,
  PARTNER_COMMISSION_MIN,
  PARTNER_COMMISSION_TYPE,
} from '../../../config/partnerCommission'
import '../../../../assets/css/partner-commission.css'

/** What the page header's Save Commission button needs to know. */
export interface PartnerCommissionFormState {
  dirty: boolean
  saving: boolean
}

interface PartnerCommissionTabProps {
  partnerId: number | string
  /** The partner's saved Funding tiers (empty when none are set), each with its commission type. */
  tiers: PartnerCommissionTier[] | null | undefined
  /** How many of the partner's clients' funding applications are funded: the next deal is one more. */
  fundedDealCount: number | null | undefined
  /** Permission "update commission": without it the tiers are only shown. */
  canEdit: boolean
  /** Told what was saved, so the page can keep it without loading everything again. */
  onSaved?: (commission: PartnerCommission) => void
  /** Drives the header's Save Commission button (enabled once changed, spinner while saving). */
  onStateChange?: (state: PartnerCommissionFormState) => void
}

type ApiError = { response?: { data?: { message?: string; errors?: Record<string, string | string[]> } } }

const BLANK_TIER: TierRow = { min_count: 0, max_count: '', commission_type: PARTNER_COMMISSION_TYPE.PERCENTAGE, percentage: '', amount: '' }

const toRows = (tiers: PartnerCommissionTier[] | null | undefined): TierRow[] =>
  tiers && tiers.length
    ? tiers.map((tier) => ({
        min_count: tier.min_count ?? '',
        max_count: tier.max_count ?? '',
        commission_type: tier.commission_type ?? PARTNER_COMMISSION_TYPE.PERCENTAGE,
        percentage: tier.percentage ?? '',
        amount: tier.amount ?? '',
      }))
    : [{ ...BLANK_TIER }]

const isBlank = (value: TierRow['percentage'] | undefined) => value === '' || value === null || value === undefined

const valueKey = (value: TierRow['percentage'] | undefined) => (isBlank(value) ? '' : String(Number(value)))

/** What decides "changed": each tier's range, type and the value it shows, numbers compared as numbers. */
const fingerprint = (rows: TierRow[]) =>
  JSON.stringify(rows.map((row) => [
    String(row.min_count ?? ''),
    String(row.max_count ?? ''),
    tierRowType(row),
    valueKey(row[tierValueField(row)]),
  ]))

const formatRate = (value: number) => `${+value.toFixed(2)}%`
const formatMoney = (value: number, fractionDigits = 0) =>
  value.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits })
/** "$500", or "$750.50" when there are cents. */
const formatAmount = (value: number) => formatMoney(value, Number.isInteger(value) ? 0 : 2)

const firstMessage = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value)

/**
 * Partner profile › Commissions: the partner's Funding commission tiers by how
 * many of its clients' funding applications have been funded (0-10, 11-20, 21
 * and up). Each tier has its own Type: Percentage (a share of the success fee)
 * or Flat Amount (a fixed $ per deal). The tiers on the left; on the right a
 * donut of the split the partner's next deal gets, with a Partner / Admin
 * legend (% and $ on an example fee). A funding application's split opens at
 * the tier for that deal. Saved by the page header's Save Commission button,
 * which submits this form.
 */
export default function PartnerCommissionTab({ partnerId, tiers, fundedDealCount, canEdit, onSaved, onStateChange }: PartnerCommissionTabProps) {
  const savedRows = useMemo(() => toRows(tiers), [tiers])
  const savedKey = fingerprint(savedRows)
  const [rows, setRows] = useState<TierRow[]>(savedRows)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const save = useUpdatePartnerCommission()

  useEffect(() => {
    setRows(savedRows)
  }, [savedKey]) // eslint-disable-line react-hooks/exhaustive-deps

  const dirty = fingerprint(rows) !== savedKey
  const savedCount = tiers?.length ?? 0

  const funded = fundedDealCount ?? 0
  const nextDeal = funded + 1
  const nextTier = tierForPosition(rows, nextDeal)
  const nextRow = nextTier >= 0 ? rows[nextTier] : null
  const nextValue = nextRow ? nextRow[tierValueField(nextRow)] : null
  const nextNumber = isBlank(nextValue) ? NaN : Number(nextValue)
  // A flat amount is shown as its share of the example fee, as the split would take it.
  const nextRate = nextRow && tierRowType(nextRow) === PARTNER_COMMISSION_TYPE.FLAT
    ? flatCommissionRate(nextNumber, PARTNER_COMMISSION_EXAMPLE_FEE, PARTNER_COMMISSION_MAX)
    : nextNumber
  const partnerShare = Number.isFinite(nextRate) && nextRate >= PARTNER_COMMISSION_MIN && nextRate <= PARTNER_COMMISSION_MAX ? nextRate : 0
  const adminShare = 100 - partnerShare

  useEffect(() => {
    onStateChange?.({ dirty, saving: save.isPending })
  }, [dirty, save.isPending, onStateChange])

  const handleChange = (next: TierRow[]) => {
    setRows(next)
    setErrors({})
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!canEdit || !dirty) return
    setErrors({})

    // The commission is required: every tier is sent with its type and that
    // type's value, a blank one as null for the API to refuse under its field.
    // The first tier always starts at 0.
    const payload = rows.map((row, index) => {
      const field = tierValueField(row)
      const value = row[field]
      return {
        min_count: index === 0 ? 0 : tierCountValue(row.min_count),
        max_count: tierCountValue(row.max_count),
        commission_type: tierRowType(row),
        [field]: isBlank(value) ? null : Number(value),
      }
    })

    save.mutate(
      { id: partnerId, payload: { tiers: payload } },
      {
        onSuccess: (res) => {
          if (res.data) onSaved?.(res.data)
          toast.success(res.message || 'Partner commission updated')
        },
        onError: (err: unknown) => {
          const data = (err as ApiError)?.response?.data
          const fieldErrors = Object.fromEntries(
            Object.entries(data?.errors ?? {})
              .filter(([key]) => key === 'tiers' || key.startsWith('tiers.'))
              .map(([key, value]) => [key, firstMessage(value) ?? ''])
          )

          if (Object.keys(fieldErrors).length) {
            setErrors(fieldErrors)
          } else {
            toast.error(data?.message || 'Failed to update the partner commission')
          }
        },
      }
    )
  }

  const savedSingle = savedCount === 1 && tiers?.[0].min_count === 0 && tiers?.[0].max_count === null ? tiers[0] : null
  const singleFlat = savedSingle?.commission_type === PARTNER_COMMISSION_TYPE.FLAT
  const singleValue = savedSingle ? (singleFlat ? savedSingle.amount : savedSingle.percentage) : null
  const savedSummary = savedCount === 0
    ? null
    : singleValue !== null && singleValue !== undefined
      ? singleFlat ? formatAmount(Number(singleValue)) : formatRate(Number(singleValue))
      : `${savedCount} tiers`

  return (
    <form id={PARTNER_COMMISSION_FORM_ID} className="pcm" onSubmit={handleSubmit} noValidate>
      <div className="pcm__card pcm__card--tiers">
      {/* The tiers */}
      <div className="pcm__left">
        <div className="pcm__title-row">
          <h5 className="pcm__title">Funding commission</h5>
          {dirty ? (
            <span className="pcm__status pcm__status--draft">Unsaved changes</span>
          ) : savedSummary ? (
            <span className="pcm__status pcm__status--saved">Current: {savedSummary}</span>
          ) : (
            <span className="pcm__status">Not set</span>
          )}
        </div>
        <p className="pcm__sub">
          What the partner earns per deal - a share of the success fee or a flat amount - by how many of its
          clients&apos; funding applications have been funded.
        </p>

        <CommissionTierTable
          idPrefix="partner-tier"
          rows={rows}
          onChange={handleChange}
          errors={errors}
          errorPrefix="tiers"
          disabled={!canEdit || save.isPending}
          maxPercent={PARTNER_COMMISSION_MAX}
          highlightIndex={nextTier}
        />

        <p className="pcm__help" id="partner-commission-help">
          Percentage: {PARTNER_COMMISSION_MIN}–{PARTNER_COMMISSION_MAX}% of the success fee. Flat Amount: a fixed $ per deal.
          A closed funding application&apos;s split starts at the tier for that deal (a flat amount as its share of the
          success fee, the admin keeping at least 1%) and can still be changed there.
        </p>
        {!canEdit && (
          <p className="pcm__readonly">
            <i className="ri-lock-line" aria-hidden="true" /> View only: changing it needs the &ldquo;update commission&rdquo; permission.
          </p>
        )}
      </div>

      {/* The split the next deal gets */}
      <div className="pcm__right">
        <p className="pcm__next" data-testid="next-deal-tier">
          {funded} funded so far.{' '}
          {nextTier >= 0
            ? `Deal #${nextDeal} falls in tier ${nextTier + 1} (${tierRangeLabel(rows[nextTier])}).`
            : `Deal #${nextDeal} is not in any tier.`}
        </p>

        <div
          className="pcm-donut"
          role="img"
          aria-label={`Partner ${formatRate(partnerShare)}, Admin ${formatRate(adminShare)}`}
          style={{ ['--pcm-share' as string]: `${partnerShare}%` }}
        >
          <span className="pcm-donut__center">
            <b>{formatRate(partnerShare)}</b>
            <small>to partner</small>
          </span>
        </div>

        <div className="pcm-legend">
          <div className="pcm-legend__caption">Next deal, on a {formatMoney(PARTNER_COMMISSION_EXAMPLE_FEE)} success fee</div>
          <div className="pcm-legend__row">
            <span className="pcm-legend__dot pcm-legend__dot--partner" aria-hidden="true" />
            <span className="pcm-legend__name">Partner</span>
            <span className="pcm-legend__rate" data-testid="commission-split-partner">{formatRate(partnerShare)}</span>
            <span className="pcm-legend__amount" data-testid="preview-partner-payout">
              {formatMoney((PARTNER_COMMISSION_EXAMPLE_FEE * partnerShare) / 100)}
            </span>
          </div>
          <div className="pcm-legend__row">
            <span className="pcm-legend__dot pcm-legend__dot--admin" aria-hidden="true" />
            <span className="pcm-legend__name">Admin</span>
            <span className="pcm-legend__rate" data-testid="commission-split-admin">{formatRate(adminShare)}</span>
            <span className="pcm-legend__amount" data-testid="preview-admin-payout">
              {formatMoney((PARTNER_COMMISSION_EXAMPLE_FEE * adminShare) / 100)}
            </span>
          </div>
        </div>
      </div>
      </div>
    </form>
  )
}
