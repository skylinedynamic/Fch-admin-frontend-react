import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import ConfirmationModal from '../GlobalModal/ConfirmationModal'
import {
  useCalendlyConnection,
  useConnectCalendly,
  useDisconnectCalendly,
  useSyncCalendly,
} from '../../modules/calendly/queries'
import { CALENDLY_RETURN_PARAM, CALENDLY_RETURN_RESULTS, type CalendlySyncDates } from '../../modules/calendly/types'
import calendlyWordmark from '../../../assets/images/logo/calendly.png'
import '../../../assets/css/calendly-appointments.css'

interface Props {
  /** The dates the calendar shows - what Sync now brings in. */
  getSyncDates: () => CalendlySyncDates
  onSynced: () => void
  /** Sends the browser to Calendly's sign-in (replaced in tests). */
  redirect?: (url: string) => void
}

/** "Nov 20, 9:30 AM" in the viewer's own time. */
const syncedAt = (iso: string): string =>
  new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })

const apiMessage = (error: unknown, fallback: string): string =>
  (error as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback

/**
 * The user's own Calendly on the Appointments page (Calendly v2): Connect,
 * Reconnect, Sync now and Disconnect. Hidden until the host has set up FCH's
 * Calendly app.
 */
export default function CalendlyConnectionCard({ getSyncDates, onSynced, redirect = (url) => window.location.assign(url) }: Props) {
  const { data: status } = useCalendlyConnection()
  const connect = useConnectCalendly()
  const disconnect = useDisconnectCalendly()
  const sync = useSyncCalendly()
  const [askDisconnect, setAskDisconnect] = useState(false)
  const [searchParams, setSearchParams] = useSearchParams()

  // Back from Calendly's sign-in: say how it went, once.
  useEffect(() => {
    const result = searchParams.get(CALENDLY_RETURN_PARAM)
    if (!result) return
    if (result === CALENDLY_RETURN_RESULTS.CONNECTED) toast.success('Calendly connected')
    else if (result === CALENDLY_RETURN_RESULTS.IN_USE) toast.error('That Calendly account is already connected by someone else. Sign in to Calendly with your own account.')
    else toast.error('Calendly could not be connected. Try again.')
    const next = new URLSearchParams(searchParams)
    next.delete(CALENDLY_RETURN_PARAM)
    setSearchParams(next, { replace: true })
  }, [searchParams, setSearchParams])

  if (!status?.app_configured) return null

  const startConnect = () =>
    connect.mutate(undefined, {
      onSuccess: (url) => redirect(url),
      onError: (error) => toast.error(apiMessage(error, 'Calendly could not be connected')),
    })

  const runSync = () =>
    sync.mutate(getSyncDates(), {
      onSuccess: (result) => {
        toast.success(`Calendly synced: ${result.created} added, ${result.updated} updated, ${result.cancelled} cancelled`)
        onSynced()
      },
      onError: (error) => toast.error(apiMessage(error, 'Calendly could not be synced')),
    })

  const confirmDisconnect = () =>
    disconnect.mutate(undefined, {
      onSuccess: () => {
        setAskDisconnect(false)
        toast.success('Calendly disconnected')
      },
      onError: (error) => toast.error(apiMessage(error, 'Calendly could not be disconnected')),
    })

  const expired = !status.connected && status.needs_reconnect

  return (
    <div className="card mb-3 calendly-connection-card">
      <div className="card-body p-3 d-flex flex-column gap-3">
        <div className="d-flex align-items-center justify-content-between gap-2">
          <img src={calendlyWordmark} alt="Calendly" className="cc-wordmark" />
          <span className={`cc-status ${status.connected ? 'is-connected' : expired ? 'is-expired' : ''}`}>
            <span className="cc-dot" aria-hidden="true"></span>{status.connected ? 'Connected' : expired ? 'Expired' : 'Not connected'}
          </span>
        </div>
        {status.connected && (status.name || status.email) && (
          <div className="cc-account min-w-0">
            {status.name && <div className="cc-name text-truncate">{status.name}</div>}
            {status.email && <div className="cc-email text-truncate" title={status.email}>{status.email}</div>}
          </div>
        )}

        {status.connected ? (
          <>
            <div className="d-flex gap-2">
              <button type="button" className="btn btn-soft-primary btn-sm flex-grow-1" onClick={runSync} disabled={sync.isPending}>
                <i className={`ri-refresh-line align-middle me-1 ${sync.isPending ? 'cc-spin' : ''}`} aria-hidden="true"></i>
                {sync.isPending ? 'Syncing…' : 'Sync now'}
              </button>
              <button
                type="button"
                className="btn btn-soft-danger btn-sm cc-icon-btn"
                aria-label="Disconnect"
                title="Disconnect"
                onClick={() => setAskDisconnect(true)}
              >
                <i className="ri-link-unlink-m fs-15" aria-hidden="true"></i>
              </button>
            </div>
            {(status.last_synced_at || status.scheduling_url) && (
              <div className="cc-meta">
                <span className="text-truncate">{status.last_synced_at ? `Last synced ${syncedAt(status.last_synced_at)}` : 'Not synced yet'}</span>
                {status.scheduling_url && (
                  <a href={status.scheduling_url} target="_blank" rel="noopener noreferrer" aria-label="Open Calendly" title="Open Calendly">
                    Open<i className="ri-external-link-line align-middle ms-1" aria-hidden="true"></i>
                  </a>
                )}
              </div>
            )}
          </>
        ) : (
          <>
            <p className="cc-text">
              {expired
                ? 'Your Calendly sign-in has expired. Connect again to keep booking in Calendly.'
                : 'Connect your own Calendly account so the meetings you book appear in it.'}
            </p>
            <button type="button" className="btn btn-primary btn-sm w-100" onClick={startConnect} disabled={connect.isPending}>
              <i className="ri-link-m align-middle me-1" aria-hidden="true"></i>
              {connect.isPending ? 'Connecting…' : expired ? 'Reconnect Calendly' : 'Connect Calendly'}
            </button>
          </>
        )}
      </div>

      <ConfirmationModal
        show={askDisconnect}
        onClose={() => setAskDisconnect(false)}
        onConfirm={confirmDisconnect}
        title="Disconnect Calendly?"
        message="New appointments will no longer be booked in your Calendly. Meetings already in the portal stay."
        confirmText="Yes, disconnect"
        confirmClassName="btn-danger"
        loading={disconnect.isPending}
        loadingText="Disconnecting..."
      />
    </div>
  )
}
