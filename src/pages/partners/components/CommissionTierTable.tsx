import CustomDropdown from '../../../components/Common/CustomDropdown'
import { nextTierRow } from '../../../modules/partner/tiers'
import {
  PARTNER_COMMISSION_AMOUNT_MAX,
  PARTNER_COMMISSION_AMOUNT_MIN,
  PARTNER_COMMISSION_TYPE,
  PARTNER_COMMISSION_TYPE_OPTIONS,
  type PartnerCommissionType,
} from '../../../config/partnerCommission'
import '../../../../assets/css/commission-tiers.css'

/**
 * A tier as the table edits it: counts may be strings while typed; a blank end
 * is "and up". Each tier has its own commission type (missing = Percentage).
 * It holds both values so switching the type and back keeps what was typed;
 * only the type's one is shown and sent.
 */
export type TierRow = {
  min_count: number | string | null
  max_count: number | string | null
  commission_type?: PartnerCommissionType
  percentage: number | string | null
  amount?: number | string | null
}

interface CommissionTierTableProps {
  /** Prefix for the inputs' ids, unique on the page. */
  idPrefix: string
  rows: TierRow[]
  onChange: (rows: TierRow[]) => void
  /** Errors keyed `${errorPrefix}.${index}.${field}`, plus `${errorPrefix}` for the table as a whole. */
  errors?: Record<string, string | undefined>
  errorPrefix: string
  disabled?: boolean
  /** Upper bound of a tier's %. */
  maxPercent?: number
  /** The tier to mark, e.g. the one the partner's next deal falls in. */
  highlightIndex?: number
}

/** A row's type: Flat Amount, or Percentage when none is set. */
export const tierRowType = (row: TierRow): PartnerCommissionType =>
  row.commission_type === PARTNER_COMMISSION_TYPE.FLAT ? PARTNER_COMMISSION_TYPE.FLAT : PARTNER_COMMISSION_TYPE.PERCENTAGE

/** The field holding a row's value: `amount` for Flat Amount, `percentage` otherwise. */
export const tierValueField = (row: TierRow): 'amount' | 'percentage' =>
  tierRowType(row) === PARTNER_COMMISSION_TYPE.FLAT ? 'amount' : 'percentage'

/**
 * Partner profile › Commissions: the partner's Funding commission tiers -
 * "0 to 10 deals: $500 flat", "11 to 20: 12%", "21 and up: 15%" - as an
 * editable table. Each tier picks its own Type (Percentage of the success fee
 * or Flat Amount per deal) in its dropdown. The first tier always starts at 0:
 * its From is fixed and it can't be removed. "Add tier" proposes the next
 * range; errors from the API show under the input they're about.
 */
export default function CommissionTierTable({
  idPrefix,
  rows,
  onChange,
  errors = {},
  errorPrefix,
  disabled = false,
  maxPercent = 100,
  highlightIndex = -1,
}: CommissionTierTableProps) {
  const update = (index: number, field: keyof TierRow, value: string) =>
    onChange(rows.map((row, i) => (i === index ? { ...row, [field]: value } : row)))

  const add = () => onChange([...rows, nextTierRow(rows, { commission_type: PARTNER_COMMISSION_TYPE.PERCENTAGE, percentage: '', amount: '' })])

  const remove = (index: number) => onChange(rows.filter((_, i) => i !== index))

  const errorFor = (index: number, field: keyof TierRow) => errors[`${errorPrefix}.${index}.${field}`]

  const cellError = (index: number, field: keyof TierRow) => {
    const message = errorFor(index, field)
    return message ? <div className="invalid-feedback d-block">{message}</div> : null
  }

  const tableError = errors[errorPrefix]

  return (
    <div className="ct">
      <div className="table-responsive ct__scroll">
        <table className="table align-middle ct__table mb-2">
          <thead>
            <tr>
              <th scope="col">From (deals)</th>
              <th scope="col">To (deals)</th>
              <th scope="col">Type</th>
              <th scope="col">Commission</th>
              {!disabled && <th scope="col" className="ct__actions"><span className="visually-hidden">Remove</span></th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const n = index + 1
              const isFirst = index === 0
              const id = (field: string) => `${idPrefix}-${index}-${field}`
              const flat = tierRowType(row) === PARTNER_COMMISSION_TYPE.FLAT
              const valueField = tierValueField(row)
              const unit = flat ? '$' : '%'

              return (
                <tr key={index} className={index === highlightIndex ? 'ct__row--current' : undefined}>
                  <td>
                    <input
                      id={id('min')}
                      type="number"
                      min={0}
                      step={1}
                      inputMode="numeric"
                      aria-label={`Tier ${n} from`}
                      className={`form-control ${errorFor(index, 'min_count') ? 'is-invalid' : ''}`}
                      value={isFirst ? 0 : row.min_count ?? ''}
                      readOnly={isFirst}
                      title={isFirst ? 'The first tier always starts at 0.' : undefined}
                      disabled={disabled}
                      onChange={(e) => !isFirst && update(index, 'min_count', e.target.value)}
                    />
                    {cellError(index, 'min_count')}
                  </td>
                  <td>
                    <input
                      id={id('max')}
                      type="number"
                      min={0}
                      step={1}
                      inputMode="numeric"
                      aria-label={`Tier ${n} to`}
                      placeholder="and up"
                      className={`form-control ${errorFor(index, 'max_count') ? 'is-invalid' : ''}`}
                      value={row.max_count ?? ''}
                      disabled={disabled}
                      onChange={(e) => update(index, 'max_count', e.target.value)}
                    />
                    {cellError(index, 'max_count')}
                  </td>
                  <td className="ct__type">
                    <CustomDropdown
                      id={id('type')}
                      ariaLabel={`Tier ${n} commission type`}
                      options={[...PARTNER_COMMISSION_TYPE_OPTIONS]}
                      value={tierRowType(row)}
                      onChange={(value: PartnerCommissionType) => update(index, 'commission_type', value)}
                      optionLabel="label"
                      optionValue="value"
                      disabled={disabled}
                      className={`w-100 ${errorFor(index, 'commission_type') ? 'is-invalid' : ''}`}
                    />
                    {cellError(index, 'commission_type')}
                  </td>
                  <td>
                    <div className="input-group">
                      {flat && <span className="input-group-text">$</span>}
                      <input
                        id={id(flat ? 'amount' : 'rate')}
                        type="number"
                        min={flat ? PARTNER_COMMISSION_AMOUNT_MIN : 0}
                        max={flat ? PARTNER_COMMISSION_AMOUNT_MAX : maxPercent}
                        step="0.01"
                        inputMode="decimal"
                        aria-label={`Tier ${n} commission (${unit})`}
                        placeholder={flat ? 'e.g. 500' : 'e.g. 10'}
                        className={`form-control ${errorFor(index, valueField) ? 'is-invalid' : ''}`}
                        value={row[valueField] ?? ''}
                        disabled={disabled}
                        onChange={(e) => update(index, valueField, e.target.value)}
                      />
                      {!flat && <span className="input-group-text">%</span>}
                    </div>
                    {cellError(index, valueField)}
                  </td>
                  {!disabled && (
                    <td className="ct__actions">
                      <button
                        type="button"
                        className="btn btn-sm btn-soft-danger"
                        aria-label={`Remove tier ${n}`}
                        title="Remove tier"
                        disabled={isFirst}
                        onClick={() => remove(index)}
                      >
                        <i className="ri-delete-bin-line" aria-hidden="true" />
                      </button>
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {tableError && <div className="invalid-feedback d-block mb-2">{tableError}</div>}

      {!disabled && (
        <button type="button" className="btn btn-sm btn-soft-primary" onClick={add}>
          <i className="ri-add-line align-middle me-1" aria-hidden="true" />
          Add tier
        </button>
      )}

      <p className="ct__help">
        Counts are the partner&apos;s funded (Closed - Completed) funding applications, all-time. Each deal is paid at the tier
        its number falls in: a percentage of its success fee, or a flat amount. The first tier starts at 0, and every tier
        needs a commission. Leave the last tier&apos;s &ldquo;To&rdquo; blank for &ldquo;and up&rdquo;.
      </p>
    </div>
  )
}
