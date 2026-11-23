import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import ConfirmationModal from '../GlobalModal/ConfirmationModal'
import {
  useCalendlyConnection,
  useConnectCalendly,
  useDisconnectCalendly,
} from '../../modules/calendly/queries'
import CalendlySyncModal from './CalendlySyncModal'
import { CALENDLY_RETURN_PARAM, CALENDLY_RETURN_RESULTS,
  CALENDLY_RETURN_TOAST_ID, type CalendlySyncDates, CALENDLY_SYNC_DIRECTIONS, type CalendlySyncDirection } from '../../modules/calendly/types'
import calendlyWordmark from '../../../assets/images/logo/calendly.png'
import '../../../assets/css/calendly-appointments.css'

interface Props {
  /** The dates the calendar shows - what Pull and Push look at. */
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
 * Reconnect, Pull from / Push to Calendly and Disconnect. Hidden until the host has set up FCH's
 * Calendly app.
 */
/** "Awlad Hossain" -> "AH"; an email gives its first letter. */
const initialsOf = (name: string): string =>
  (name.includes('@') ? name.slice(0, 1).toUpperCase() : name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]!.toUpperCase()).join('')) || '?'

export default function CalendlyConnectionCard({ getSyncDates, onSynced, redirect = (url) => window.location.assign(url) }: Props) {
  const { data: status } = useCalendlyConnection()
  const connect = useConnectCalendly()
  const disconnect = useDisconnectCalendly()
  // Which way and the dates the calendar showed when Pull or Push was pressed; set while that modal is open.
  const [sync, setSync] = useState<{ direction: CalendlySyncDirection; dates: CalendlySyncDates } | null>(null)
  // Open or not, apart from which way: a closing modal keeps its direction while it fades out.
  const [syncOpen, setSyncOpen] = useState(false)
  const [askDisconnect, setAskDisconnect] = useState(false)
  const [searchParams, setSearchParams] = useSearchParams()

  // Back from Calendly's sign-in: say how it went, once.
  useEffect(() => {
    const result = searchParams.get(CALENDLY_RETURN_PARAM)
    if (!result) return
    // One id: React's StrictMode runs this twice in development, and the toast must still show once.
    const once = { toastId: CALENDLY_RETURN_TOAST_ID }
    if (result === CALENDLY_RETURN_RESULTS.CONNECTED) toast.success('Calendly connected', once)
    else if (result === CALENDLY_RETURN_RESULTS.IN_USE) toast.error('That Calendly account is already connected by someone else. Sign in to Calendly with your own account.', once)
    else toast.error('Calendly could not be connected. Try again.', once)
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

  // Pull from Calendly / Push to Calendly: each opens its own list for the dates shown.
  const openSync = (direction: CalendlySyncDirection) => {
    setSync({ direction, dates: getSyncDates() })
    setSyncOpen(true)
  }

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
          <div className="cc-account">
            <span className="cc-avatar" aria-hidden="true">{initialsOf(status.name || status.email || '')}</span>
            <div className="min-w-0">
              {status.name && <div className="cc-name text-truncate">{status.name}</div>}
              {status.email && <div className="cc-email text-truncate" title={status.email}>{status.email}</div>}
            </div>
          </div>
        )}

        {status.connected ? (
          <>
            <div className="cc-sync-row">
              <button type="button" className="btn btn-sm cc-sync-btn" onClick={() => openSync(CALENDLY_SYNC_DIRECTIONS.PULL)}>
                <i className="ri-download-2-line align-middle me-1" aria-hidden="true"></i>
                Pull from Calendly
              </button>
              <button type="button" className="btn btn-sm cc-sync-btn" onClick={() => openSync(CALENDLY_SYNC_DIRECTIONS.PUSH)}>
                <i className="ri-upload-2-line align-middle me-1" aria-hidden="true"></i>
                Push to Calendly
              </button>
            </div>
            {/* Last synced, Open in Calendly, and Disconnect - out of the way of the two main buttons. */}
            <div className="cc-meta">
              <span className="text-truncate">{status.last_synced_at ? `Last synced ${syncedAt(status.last_synced_at)}` : 'Not synced yet'}</span>
              <span className="d-inline-flex align-items-center gap-3">
                {status.scheduling_url && (
                  <a href={status.scheduling_url} target="_blank" rel="noopener noreferrer" aria-label="Open Calendly" title="Open Calendly">
                    Open<i className="ri-external-link-line align-middle ms-1" aria-hidden="true"></i>
                  </a>
                )}
                <button type="button" className="cc-disconnect" aria-label="Disconnect" title="Disconnect" onClick={() => setAskDisconnect(true)}>
                  <i className="ri-link-unlink-m align-middle me-1" aria-hidden="true"></i>Disconnect
                </button>
              </span>
            </div>
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

      <CalendlySyncModal
        show={syncOpen}
        direction={sync?.direction ?? CALENDLY_SYNC_DIRECTIONS.PULL}
        dates={sync?.dates ?? { from: '', to: '' }}
        onClose={() => setSyncOpen(false)}
        onSynced={onSynced}
      />

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
