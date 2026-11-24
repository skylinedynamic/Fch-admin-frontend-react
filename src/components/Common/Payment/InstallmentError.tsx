/**
 * The keys an enrollment's installment errors are mapped to from the API's
 * enrollment.* fields (partner and client forms), in the order shown.
 */
export const INSTALLMENT_ERROR_KEYS = [
  'installment_months',
  'installment_down_payment',
  'installment_monthly_amount',
  'installment_remaining_balance',
] as const

type Errors = Record<string, unknown> | null | undefined

/** The first installment error, or null. */
export const installmentErrorOf = (errors: Errors): string | null => {
  for (const key of INSTALLMENT_ERROR_KEYS) {
    const value = errors?.[key]
    if (typeof value === 'string' && value) return value
  }
  return null
}

/**
 * Shows why the API refused the installment (e.g. more months than the plan's
 * "Installment Upto"). These fields are set in the calculator modal, so their
 * errors had nowhere to show and a refused Save looked like nothing (R3-BUG-057).
 */
export const InstallmentError = ({ errors }: { errors: Errors }) => {
  const message = installmentErrorOf(errors)
  if (!message) return null

  return (
    <div className="invalid-feedback d-block" role="alert">
      {message}
    </div>
  )
}

export default InstallmentError
