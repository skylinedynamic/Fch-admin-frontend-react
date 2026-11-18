import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-toastify'
import { Skeleton } from 'primereact/skeleton'
import { queryKeys } from '../../../lib/query'
import { useCalendlySettings } from '../../../modules/calendly/queries'
import { saveCalendlySettings } from '../../../modules/calendly/services'
import type { CalendlySettingsData } from '../../../modules/calendly/types'
import { useConfigPartnerId } from '../../../modules/settings/configPartner'
import calendlyLogo from '../../../../assets/images/integrations/calendly.svg'

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

// The secrets are write-only, as on OpenAI Configuration: never sent back, so a
// saved one shows as this stand-in. Left as it is, it keeps the saved one; typed
// over, it is replaced. A real secret never contains this character.
const MASK_CHAR = '•'
const STORED_MASK = MASK_CHAR.repeat(48)

const keysOf = (settings?: CalendlySettingsData): Keys => ({
  client_id: settings?.client_id ?? '',
  client_secret: settings?.has_client_secret ? STORED_MASK : '',
  webhook_signing_key: settings?.has_webhook_signing_key ? STORED_MASK : '',
})

/** What is sent for a secret: nothing (keep the saved one) while it still holds the stand-in. */
const typed = (value: string) => (value === STORED_MASK ? '' : value.trim())

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
 * Client Secret, Webhook Signing Key), editable at any time by that partner's
 * own account (host, WLP or certified) or by the host account (Partners >
 * partner > Configuration, through ConfigPartnerProvider). The Client Secret
 * and Signing Key are never shown again once saved - only that they are, by
 * their last characters - and their fields are masked.
 * Only the keys live here: the Calendly account is connected, synced and
 * disconnected on the Appointments page.
 */
export default function CalendlySettings() {
  const queryClient = useQueryClient()
  const partnerId = useConfigPartnerId()
  const { data: settings, isLoading, isError, error: loadError } = useCalendlySettings(partnerId)

  const [keys, setKeys] = useState<Keys>(keysOf())
  const [errors, setErrors] = useState<Record<string, string>>({})
  // The Client ID is masked until the eye button is pressed.
  const [showClientId, setShowClientId] = useState(false)

  // The saved keys fill the form whenever they (re)load.
  useEffect(() => {
    if (settings) setKeys(keysOf(settings))
  }, [settings])

  const save = useMutation({
    mutationFn: () =>
      saveCalendlySettings({
        ...(partnerId ? { partner_id: partnerId } : {}),
        client_id: keys.client_id.trim(),
        client_secret: typed(keys.client_secret),
        webhook_signing_key: typed(keys.webhook_signing_key),
      }),
    onSuccess: (saved) => {
      setErrors({})
      // The secrets just typed leave the page at once (the reply may equal what was loaded,
      // so the reload alone would not clear them).
      setKeys(keysOf(saved))
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
  const hasSecret = Boolean(settings?.has_client_secret)
  const dirty =
    keys.client_id !== saved.client_id ||
    typed(keys.client_secret) !== '' ||
    typed(keys.webhook_signing_key) !== ''
  const set = (field: keyof Keys) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target
    setKeys((current) => ({
      ...current,
      // Editing the stand-in replaces it rather than typing onto it: what is left once
      // its characters are dropped is exactly what was typed or pasted.
      [field]: current[field] === STORED_MASK && value !== STORED_MASK ? value.split(MASK_CHAR).join('') : value,
    }))
  }

  // The Client ID, as OpenAI Configuration's Agent IDs: not a secret (Calendly puts it in
  // its sign-in link), but masked on screen by default - the eye button shows it.
  const clientIdField = () => (
    <div className="mb-3">
      <label htmlFor="calendly-client_id" className="form-label fs-13 fw-semibold">
        Client ID <span className="text-danger">*</span>
      </label>
      <div className="input-group">
        <span className={`input-group-text ${errors.client_id ? 'bg-danger-subtle text-danger border-danger' : 'bg-light text-muted'}`}>
          <i className="ri-apps-2-line" aria-hidden="true" />
        </span>
        <input
          id="calendly-client_id"
          type={showClientId ? 'text' : 'password'}
          className={`form-control font-monospace ${errors.client_id ? 'is-invalid' : ''}`}
          value={keys.client_id}
          onChange={set('client_id')}
          placeholder="Your Client ID"
          autoComplete="new-password"
          spellCheck={false}
        />
        <button
          type="button"
          className="input-group-text bg-white text-muted"
          onClick={() => setShowClientId((shown) => !shown)}
          aria-label={`${showClientId ? 'Hide' : 'Show'} Client ID`}
          title={showClientId ? 'Hide Client ID' : 'Show Client ID'}
        >
          <i className={showClientId ? 'ri-eye-off-line' : 'ri-eye-line'} aria-hidden="true" />
        </button>
      </div>
      {errors.client_id ? (
        <div className="text-danger fs-12 mt-1">{errors.client_id}</div>
      ) : (
        <div className="form-text fs-12">Your Calendly OAuth app&apos;s Client ID.</div>
      )}
    </div>
  )

  // A secret, as OpenAI Configuration's API key: masked, the saved one never sent to the
  // browser - a stand-in shows it is there.
  const secretField = (id: 'client_secret' | 'webhook_signing_key', label: string, isSaved: boolean, help: string, required = false) => (
    <div className="mb-3">
      <label htmlFor={`calendly-${id}`} className="form-label fs-13 fw-semibold">
        {label} {required && !isSaved && <span className="text-danger">*</span>}
      </label>
      <div className="input-group">
        <span className={`input-group-text ${errors[id] ? 'bg-danger-subtle text-danger border-danger' : 'bg-light text-muted'}`}>
          <i className="ri-key-2-line" aria-hidden="true" />
        </span>
        <input
          id={`calendly-${id}`}
          type="password"
          className={`form-control font-monospace ${errors[id] ? 'is-invalid' : ''}`}
          value={keys[id]}
          onChange={set(id)}
          placeholder={`Your ${label}`}
          // Not offered to the browser's password manager, nor filled from it.
          autoComplete="new-password"
          spellCheck={false}
        />
      </div>
      {errors[id] ? (
        <div className="text-danger fs-12 mt-1">{errors[id]}</div>
      ) : (
        <div className="form-text fs-12">
          {isSaved
            ? `A ${label} is already stored, encrypted, on the server - it is never sent back to the browser, so this shows a placeholder rather than the ${label} itself. Leave it as is to keep it, or type over it to replace it.`
            : help}
        </div>
      )}
    </div>
  )

  return (
    <div className="card">
      <div className="card-header d-flex align-items-center gap-3 bg-white border-bottom py-3">
        <div className="avatar-sm flex-shrink-0">
          <div className="avatar-title bg-primary-subtle rounded">
            <img src={calendlyLogo} alt="" width={22} height={22} aria-hidden="true" />
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
              {clientIdField()}
              {secretField(
                'client_secret',
                'Client Secret',
                hasSecret,
                'Your Calendly OAuth app\'s Client Secret. Stored encrypted on the server and never sent back to the browser.',
                true,
              )}
              {secretField(
                'webhook_signing_key',
                'Webhook Signing Key',
                Boolean(settings.has_webhook_signing_key),
                'Calendly signs its webhooks with it. Leave it empty and FCH makes one when connecting. Stored encrypted.',
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

              <button
                type="submit"
                className="btn btn-primary"
                disabled={save.isPending || !dirty || !keys.client_id.trim() || (!hasSecret && !typed(keys.client_secret))}
              >
                {save.isPending ? 'Saving…' : 'Save keys'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
