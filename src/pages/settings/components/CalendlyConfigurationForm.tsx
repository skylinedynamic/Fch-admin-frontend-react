import { useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import { useCalendlySettings, useSaveCalendlySettings } from '../../../modules/calendly/queries'
import calendlyWordmark from '../../../../assets/images/logo/calendly.png'
import { SECRET_DISPLAY_MASK } from '../../../config/appConfig'
import { CalendlyConfigSkeleton } from '../../../components/Loader/SpecificSkeletons'

type ApiError = { response?: { data?: { message?: string; errors?: Record<string, string[]> } } }

/**
 * Settings > Calendly Configuration (Calendly v2): FCH's one Calendly OAuth
 * app - host only. The Client Secret is write-only: a saved one shows as
 * dots (never its value), and saving the dots - or nothing - keeps it. Everyone then connects their own
 * Calendly from their Appointments page.
 */
export default function CalendlyConfigurationForm() {
  const { data: settings, isLoading } = useCalendlySettings()
  const save = useSaveCalendlySettings()
  const [clientId, setClientId] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [errors, setErrors] = useState<Record<string, string[]>>({})

  useEffect(() => {
    if (!settings) return
    setClientId(settings.client_id ?? '')
    setClientSecret(settings.has_client_secret ? SECRET_DISPLAY_MASK : '')
  }, [settings])

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})
    save.mutate(
      // The dots stand for the saved secret: blank tells the API to keep it.
      { client_id: clientId.trim(), client_secret: clientSecret === SECRET_DISPLAY_MASK ? '' : clientSecret },
      {
        onSuccess: (saved) => {
          setClientSecret(saved?.has_client_secret ? SECRET_DISPLAY_MASK : '')
          toast.success('Calendly configuration saved')
        },
        onError: (error) => {
          const data = (error as ApiError).response?.data
          if (data?.errors) setErrors(data.errors)
          else toast.error(data?.message || 'Calendly configuration could not be saved')
        },
      }
    )
  }

  return (
    <div className="card">
      <div className="card-header d-flex align-items-center gap-3 bg-white border-bottom py-3">
        <div className="avatar-sm flex-shrink-0">
          <div className="avatar-title bg-info-subtle text-info rounded fs-20">
            <i className="ri-calendar-check-line"></i>
          </div>
        </div>
        <div className="flex-grow-1">
          <h5 className="card-title mb-0 fs-15">Calendly Configuration</h5>
          <p className="text-muted mb-0 fs-13">FCH's one Calendly app, used by everyone who connects their Calendly</p>
        </div>
        {settings && (
          <span className={`badge ${settings.configured ? 'bg-success-subtle text-success' : 'bg-secondary-subtle text-secondary'}`}>
            {settings.configured ? 'Set up' : 'Not set up'}
          </span>
        )}
      </div>
      {isLoading || !settings ? (
        <div className="card-body p-4"><CalendlyConfigSkeleton /></div>
      ) : (
      <form className="card-body p-4 d-flex flex-column gap-3" onSubmit={submit}>
        <div className="d-flex align-items-center bg-info-subtle rounded-3 p-3 mb-2">
          <div className="flex-shrink-0 me-4">
            <img src={calendlyWordmark} alt="Calendly" style={{ height: '35px' }} />
          </div>
          <div className="flex-grow-1">
            <h6 className="mb-1 text-dark fw-semibold fs-14">Appointment scheduling</h6>
            <p className="text-muted mb-0 fs-13">
              Create one app at developer.calendly.com with a neutral name (for example "Appointment Calendar Sync")
              and enter its keys here. Staff, partners and clients then connect their own Calendly accounts from
              their Appointments page.
            </p>
          </div>
        </div>

        <div className="row g-3">
          <div className="col-md-7">
            <div className="form-label fs-13 mb-1">Redirect URI to enter on the Calendly app</div>
            <code className="d-block p-2 bg-light rounded fs-12 text-break">{settings.redirect_uri}</code>
          </div>
          <div className="col-md-5">
            <div className="form-label fs-13 mb-1">Scopes to tick on the Calendly app</div>
            <div className="d-flex flex-wrap gap-1">
              {settings.scopes.map((scope) => <span key={scope} className="badge bg-light text-dark border fw-normal">{scope}</span>)}
            </div>
          </div>
        </div>

        <div>
          <label htmlFor="calendly-client-id" className="form-label fs-13">Client ID</label>
          <input
            id="calendly-client-id"
            className={`form-control ${errors.client_id ? 'is-invalid' : ''}`}
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            autoComplete="off"
          />
          {errors.client_id && <div className="invalid-feedback">{errors.client_id[0]}</div>}
        </div>

        <div>
          <label htmlFor="calendly-client-secret" className="form-label fs-13">Client Secret</label>
          <input
            id="calendly-client-secret"
            type="password"
            className={`form-control ${errors.client_secret ? 'is-invalid' : ''}`}
            value={clientSecret}
            onChange={(e) => setClientSecret(e.target.value)}
            onFocus={() => clientSecret === SECRET_DISPLAY_MASK && setClientSecret('')}
            onBlur={() => settings.has_client_secret && clientSecret === '' && setClientSecret(SECRET_DISPLAY_MASK)}
            autoComplete="new-password"
          />
          {settings.has_client_secret && !errors.client_secret && (
            <div className="form-text fs-12">Saved - type a new one to replace it.</div>
          )}
          {errors.client_secret && <div className="invalid-feedback">{errors.client_secret[0]}</div>}
        </div>

        <div className="d-flex justify-content-end pt-3 border-top">
          <button type="submit" className="btn btn-primary" disabled={save.isPending}>
            {save.isPending ? 'Saving…' : 'Save Configuration'}
          </button>
        </div>
      </form>
      )}
    </div>
  )
}
