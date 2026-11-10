import { useEffect, useState, type FormEvent } from 'react'
import { toast } from 'react-toastify'
import { useUpdatePartnerCommission } from '../../../modules/partner'
import {
  PARTNER_COMMISSION_EXAMPLE_FEE,
  PARTNER_COMMISSION_FORM_ID,
  PARTNER_COMMISSION_MAX,
  PARTNER_COMMISSION_MIN,
  PARTNER_COMMISSION_RANGE_ERROR,
} from '../../../config/partnerCommission'
import '../../../../assets/css/partner-commission.css'

/** What the page header's Save Commission button needs to know. */
export interface PartnerCommissionFormState {
  dirty: boolean
  saving: boolean
}

interface PartnerCommissionTabProps {
  partnerId: number | string
  /** The partner's saved commission (%), or null when none is set. */
  commission: number | string | null | undefined
  /** Permission "update commission": without it the rate is only shown. */
  canEdit: boolean
  /** Told the saved value, so the page can keep it without loading everything again. */
  onSaved?: (commission: number | null) => void
  /** Drives the header's Save Commission button (enabled once changed, spinner while saving). */
  onStateChange?: (state: PartnerCommissionFormState) => void
}

type ApiError = { response?: { data?: { message?: string; errors?: Record<string, string | string[]> } } }

const toInput = (value: PartnerCommissionTabProps['commission']) =>
  value === null || value === undefined || value === '' ? '' : String(Number(value))

const formatRate = (value: number) => `${+value.toFixed(2)}%`
const formatMoney = (value: number) =>
  value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

/**
 * Partner profile › Commissions: the partner's share (%) of the success fee on
 * its clients' funding applications. The rate field on the left; on the right
 * a donut of the split with a Partner / Admin legend (% and $ on an example fee).
 * The commission split on a closed application starts at this rate. Saved by
 * the page header's Save Commission button, which submits this form.
 */
export default function PartnerCommissionTab({ partnerId, commission, canEdit, onSaved, onStateChange }: PartnerCommissionTabProps) {
  const saved = toInput(commission)
  const [value, setValue] = useState(saved)
  const [error, setError] = useState('')
  const save = useUpdatePartnerCommission()

  useEffect(() => {
    setValue(saved)
  }, [saved])

  const parsed = value === '' ? null : Number(value)
  const outOfRange = parsed !== null && (isNaN(parsed) || parsed < PARTNER_COMMISSION_MIN || parsed > PARTNER_COMMISSION_MAX)
  const partnerShare = parsed !== null && !outOfRange ? parsed : 0
  const adminShare = 100 - partnerShare
  const dirty = value !== saved

  useEffect(() => {
    onStateChange?.({ dirty, saving: save.isPending })
  }, [dirty, save.isPending, onStateChange])

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!canEdit || !dirty) return
    if (outOfRange) {
      setError(PARTNER_COMMISSION_RANGE_ERROR)
      return
    }
    setError('')
    save.mutate(
      { id: partnerId, payload: { commission: parsed } },
      {
        onSuccess: (res) => {
          onSaved?.(res.data?.commission ?? parsed)
          toast.success(res.message || 'Partner commission updated')
        },
        onError: (err: unknown) => {
          const data = (err as ApiError)?.response?.data
          const fieldError = data?.errors?.commission
          const message = (Array.isArray(fieldError) ? fieldError[0] : fieldError) || data?.message
          if (fieldError) {
            setError(message as string)
          } else {
            toast.error(message || 'Failed to update the partner commission')
          }
        },
      }
    )
  }

  return (
    <form id={PARTNER_COMMISSION_FORM_ID} className="pcm" onSubmit={handleSubmit} noValidate>
      <div className="pcm__card">
      {/* The rate */}
      <div className="pcm__left">
        <div className="pcm__title-row">
          <h5 className="pcm__title">Partner commission</h5>
          {dirty ? (
            <span className="pcm__status pcm__status--draft">Unsaved changes</span>
          ) : saved !== '' ? (
            <span className="pcm__status pcm__status--saved">Current: {formatRate(Number(saved))}</span>
          ) : (
            <span className="pcm__status">Not set</span>
          )}
        </div>
        <p className="pcm__sub">The partner&apos;s share of the success fee.</p>

        <label className="form-label" htmlFor="partner-commission-rate">
          Partner Commission (%)
        </label>
        <div className="input-group material-shadow">
          <input
            id="partner-commission-rate"
            type="number"
            inputMode="decimal"
            className={`form-control ${error ? 'is-invalid' : ''}`}
            min={PARTNER_COMMISSION_MIN}
            max={PARTNER_COMMISSION_MAX}
            step="0.01"
            placeholder="Enter commission"
            value={value}
            disabled={!canEdit || save.isPending}
            aria-invalid={!!error}
            aria-describedby="partner-commission-help"
            onChange={(e) => {
              setValue(e.target.value)
              setError('')
            }}
          />
          <span className="input-group-text text-muted px-3">%</span>
          {error && <div className="invalid-feedback">{error}</div>}
        </div>
        <p className="pcm__help" id="partner-commission-help">
          {PARTNER_COMMISSION_MIN}–{PARTNER_COMMISSION_MAX}%. A closed funding application&apos;s split starts at this rate and can
          still be changed there. Leave blank and the admin keeps 100%.
        </p>
        {!canEdit && (
          <p className="pcm__readonly">
            <i className="ri-lock-line" aria-hidden="true" /> View only: changing it needs the &ldquo;update commission&rdquo; permission.
          </p>
        )}
      </div>

      {/* The split it gives */}
      <div className="pcm__right">
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
          <div className="pcm-legend__caption">On a {formatMoney(PARTNER_COMMISSION_EXAMPLE_FEE)} success fee</div>
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
