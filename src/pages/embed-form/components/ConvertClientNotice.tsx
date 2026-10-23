import type { ExistingBorrowerSummary } from '../../../modules/embed-form'

type Props = {
  email?: string | null
  /** The client the submission joins; null when a new client is created. */
  existingBorrower: ExistingBorrowerSummary | null
}

const FundingApplicationLine = () => (
  <div className="ef-convert-notice__funding">
    <i className="ri-file-add-line" aria-hidden="true" />
    <span>A new funding application will be generated for this client.</span>
  </div>
)

/**
 * The Convert modal's main message: either the client already exists (a
 * warning - no new account is created) or no client was found (a new one is
 * created). Both say a new funding application is generated.
 */
export default function ConvertClientNotice({ email, existingBorrower }: Props) {
  const emailLabel = email ? <strong>{email}</strong> : 'this email'

  if (existingBorrower) {
    return (
      <div className="ef-convert-notice ef-convert-notice--existing" role="alert">
        <i className="ri-error-warning-line ef-convert-notice__icon" aria-hidden="true" />
        <div className="ef-convert-notice__body">
          <div className="ef-convert-notice__title">This client already exists</div>
          <div className="ef-convert-notice__text">
            A client with {emailLabel} is already registered. <strong>No new client account will be created.</strong>
          </div>
          <FundingApplicationLine />
        </div>
      </div>
    )
  }

  return (
    <div className="ef-convert-notice ef-convert-notice--new" role="status">
      <i className="ri-information-line ef-convert-notice__icon" aria-hidden="true" />
      <div className="ef-convert-notice__body">
        <div className="ef-convert-notice__title">No existing client found</div>
        <div className="ef-convert-notice__text">
          No client with {emailLabel} exists, so <strong>a new client will be created</strong> on the free plan and
          welcome login details will be emailed to them.
        </div>
        <FundingApplicationLine />
      </div>
    </div>
  )
}
