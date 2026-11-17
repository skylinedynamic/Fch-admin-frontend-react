import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-toastify'
import { Skeleton } from 'primereact/skeleton'
import { queryKeys } from '../../../lib/query'
import { useCalendlySettings } from '../../../modules/calendly/queries'
import { saveCalendlySettings } from '../../../modules/calendly/services'
import type { CalendlySettingsData } from '../../../modules/calendly/types'
import { useConfigPartnerId } from '../../../modules/settings/configPartner'

type ApiError = { response?: { data?: { message?: string; errors?: Record<string, string[] | string> } } }

const errorMessage = (error: unknown, fallback: string) => (error as ApiError)?.response?.data?.message || fallback

const fieldErrors = (error: unknown): Record<string, string> =>
  Object.fromEntries(
    Object.entries((error as ApiError)?.response?.data?.errors ?? {}).map(([field, messages]) => [
      field,
      Array.isArray(messages) ? messages[0] : messages,
    ]),
  )

type Keys = { client_id: string; client_secret: string; webhook_signing_key: string }

const keysOf = (settings?: CalendlySettingsData): Keys => ({
  client_id: settings?.client_id ?? '',
  client_secret: settings?.client_secret ?? '',
  webhook_signing_key: settings?.webhook_signing_key ?? '',
})

const copy = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text)
    toast.success('Copied')
  } catch {
    toast.error('Could not copy')
  }
}

/**
 * Settings > Calendly - a partner's own Calendly OAuth app keys (Client ID,
 * Client Secret, Webhook Signing Key), shown in full and editable at any time
 * by that partner's own account (host, WLP or certified) or by the host
 * account (Partners > partner > Configuration, through ConfigPartnerProvider).
 * Only the keys live here: the Calendly account is connected, synced and
 * disconnected on the Appointments page.
 */
export default function CalendlySettings() {
  const queryClient = useQueryClient()
  const partnerId = useConfigPartnerId()
  const { data: settings, isLoading, isError, error: loadError } = useCalendlySettings(partnerId)

  const [keys, setKeys] = useState<Keys>(keysOf())
  const [errors, setErrors] = useState<Record<string, string>>({})

  // The saved keys fill the form whenever they (re)load.
  useEffect(() => {
    if (settings) setKeys(keysOf(settings))
  }, [settings])

  const save = useMutation({
    mutationFn: () =>
      saveCalendlySettings({
        ...(partnerId ? { partner_id: partnerId } : {}),
        client_id: keys.client_id.trim(),
        client_secret: keys.client_secret.trim(),
        webhook_signing_key: keys.webhook_signing_key.trim(),
      }),
    onSuccess: (saved) => {
      setErrors({})
      queryClient.setQueryData(queryKeys.calendly.settings(partnerId), saved)
      queryClient.invalidateQueries({ queryKey: queryKeys.calendly.all })
      toast.success('Calendly settings saved')
    },
    onError: (error) => {
      setErrors(fieldErrors(error))
      toast.error(errorMessage(error, 'Could not save the Calendly settings'))
    },
  })

  const connected = Boolean(settings?.connected)
  const saved = keysOf(settings)
  const dirty =
    keys.client_id !== saved.client_id ||
    keys.client_secret !== saved.client_secret ||
    keys.webhook_signing_key !== saved.webhook_signing_key
  const set = (field: keyof Keys) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setKeys((current) => ({ ...current, [field]: event.target.value }))

  const field = (id: keyof Keys, label: string, help: string, required = false) => (
    <div className="mb-3">
      <label htmlFor={`calendly-${id}`} className="form-label fs-13 fw-semibold">
        {label} {required && <span className="text-danger">*</span>}
      </label>
      <input
        id={`calendly-${id}`}
        type="text"
        className={`form-control font-monospace ${errors[id] ? 'is-invalid' : ''}`}
        value={keys[id]}
        onChange={set(id)}
        autoComplete="off"
        spellCheck={false}
      />
      {errors[id] ? <div className="invalid-feedback">{errors[id]}</div> : <div className="form-text fs-12">{help}</div>}
    </div>
  )

  return (
    <div className="card">
      <div className="card-header d-flex align-items-center gap-3 bg-white border-bottom py-3">
        <div className="avatar-sm flex-shrink-0">
          <div className="avatar-title bg-primary-subtle text-primary rounded fs-20">
            <i className="ri-calendar-event-line"></i>
          </div>
        </div>
        <div className="flex-grow-1">
          <h5 className="card-title mb-0 fs-15">Calendly</h5>
          <p className="text-muted mb-0 fs-13">Calendly app keys - connect the Calendly account from Appointments</p>
        </div>
        {connected && <span className="badge bg-success-subtle text-success">Connected</span>}
        {!connected && settings?.needs_reconnect && <span className="badge bg-warning-subtle text-warning">Expired</span>}
        {!connected && !settings?.needs_reconnect && settings && !settings.configured && (
          <span className="badge bg-secondary-subtle text-secondary">Not set up</span>
        )}
      </div>

      <div className="card-body p-4">
        {isLoading ? (
          <>
            <Skeleton width="100%" height="60px" className="mb-3" />
            <Skeleton width="100%" height="38px" className="mb-3" />
            <Skeleton width="180px" height="38px" />
          </>
        ) : isError || !settings ? (
          <div className="alert alert-danger fs-13 mb-0">{errorMessage(loadError, 'Could not load the Calendly settings')}</div>
        ) : (
          <>
            <h6 className="fs-14 fw-semibold mb-1">Calendly app keys</h6>
            <p className="text-muted fs-13 mb-3">
              From the OAuth app at developer.calendly.com. They can be changed here at any time.
            </p>

            <form
              onSubmit={(event) => {
                event.preventDefault()
                save.mutate()
              }}
            >
              {field('client_id', 'Client ID', 'Your Calendly OAuth app\'s Client ID.', true)}
              {field('client_secret', 'Client Secret', 'Your Calendly OAuth app\'s Client Secret.', true)}
              {field(
                'webhook_signing_key',
                'Webhook Signing Key',
                'Calendly signs its webhooks with it. Leave it empty and FCH makes one when connecting.',
              )}

              <div className="bg-light rounded-3 p-3 mb-3 fs-13">
                <div className="mb-2">
                  <div className="fw-semibold mb-1">Redirect URI - enter it on your Calendly app exactly as shown</div>
                  <div className="d-flex align-items-center gap-2">
                    <code className="text-break flex-grow-1">{settings.redirect_uri}</code>
                    <button type="button" className="btn btn-sm btn-soft-secondary" onClick={() => copy(settings.redirect_uri)}>
                      Copy
                    </button>
                  </div>
                </div>
                {settings.scopes.length > 0 && (
                  <div>
                    <div className="fw-semibold mb-1">Scopes - tick these on your Calendly app</div>
                    <div className="d-flex flex-wrap gap-1">
                      {settings.scopes.map((scope) => (
                        <span key={scope} className="badge bg-white text-dark border font-monospace">{scope}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {connected && keys.client_id.trim() !== saved.client_id && (
                <p className="text-warning fs-12">
                  A different Client ID is another Calendly app: saving disconnects Calendly, then connect it again from Appointments.
                </p>
              )}

              <button type="submit" className="btn btn-primary" disabled={save.isPending || !dirty || !keys.client_id.trim()}>
                {save.isPending ? 'Saving…' : 'Save keys'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
