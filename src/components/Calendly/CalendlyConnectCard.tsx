import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-toastify'
import { queryKeys } from '../../lib/query'
import { useCalendlyStatus } from '../../modules/calendly/queries'
import { disconnectCalendly, fetchCalendlyConnectUrl, syncCalendly } from '../../modules/calendly/services'

type Props = {
  /** Opens the Calendly booking form. */
  onBook: () => void
  /** Calendly meetings were brought in - reload the calendar. */
  onSynced: () => void
  /** Sends the browser to Calendly's sign-in (replaceable in tests). */
  redirect?: (url: string) => void
}

const errorMessage = (error: unknown, fallback: string) =>
  (error as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback

/**
 * The company Calendly account on the Appointments page: whether it is
 * connected, booking into it, and - for the host's team - connecting, syncing
 * and disconnecting it. Renders nothing for someone who can neither book nor
 * manage it.
 */
export default function CalendlyConnectCard({ onBook, onSynced, redirect = (url) => window.location.assign(url) }: Props) {
  const queryClient = useQueryClient()
  const { data: status } = useCalendlyStatus()
  const refreshStatus = () => queryClient.invalidateQueries({ queryKey: queryKeys.calendly.all })

  const connect = useMutation({
    mutationFn: fetchCalendlyConnectUrl,
    onSuccess: (url) => redirect(url),
    onError: (error) => toast.error(errorMessage(error, 'Could not start connecting Calendly')),
  })

  const sync = useMutation({
    mutationFn: syncCalendly,
    onSuccess: (count) => {
      toast.success(`${count} Calendly meeting(s) synced`)
      refreshStatus()
      onSynced()
    },
    onError: (error) => toast.error(errorMessage(error, 'Calendly sync failed')),
  })

  const disconnect = useMutation({
    mutationFn: disconnectCalendly,
    onSuccess: () => {
      toast.success('Calendly disconnected')
      refreshStatus()
    },
    onError: (error) => toast.error(errorMessage(error, 'Could not disconnect Calendly')),
  })

  const connected = Boolean(status?.connected)
  const canManage = Boolean(status?.can_manage)

  if (!status || (!canManage && !connected)) {
    return null
  }

  const confirmDisconnect = () => {
    if (window.confirm('Disconnect Calendly? Meetings already brought in stay on the calendar.')) {
      disconnect.mutate()
    }
  }

  return (
    <div className="card mb-3 calendly-card">
      <div className="card-body">
        <div className="d-flex align-items-center mb-2">
          <i className="ri-calendar-event-line fs-18 me-2 text-primary" aria-hidden="true"></i>
          <h6 className="mb-0 flex-grow-1">Calendly</h6>
          {connected && <span className="badge bg-success-subtle text-success">Connected</span>}
          {!connected && status.needs_reconnect && <span className="badge bg-warning-subtle text-warning">Expired</span>}
        </div>

        {connected && (
          <p className="text-muted fs-12 mb-2">
            {status.name}
            {status.email ? ` · ${status.email}` : ''}
          </p>
        )}

        {connected && canManage && status.webhooks_active === false && (
          <p className="text-warning fs-12 mb-2">
            Webhooks are not active - new Calendly bookings appear after a sync (hourly, or Sync now).
          </p>
        )}

        {connected && canManage && status.last_synced_at && (
          <p className="text-muted fs-12 mb-2">Last synced {new Date(status.last_synced_at).toLocaleString()}</p>
        )}

        {!connected && canManage && (
          <>
            <p className="text-muted fs-12 mb-2">
              Connect the company Calendly account to see its meetings here and book into it.
            </p>
            <button type="button" className="btn btn-primary w-100" disabled={connect.isPending} onClick={() => connect.mutate()}>
              {status.needs_reconnect ? 'Reconnect Calendly' : 'Connect Calendly'}
            </button>
          </>
        )}

        {connected && status.can_book && (
          <button type="button" className="btn btn-outline-primary w-100 mb-2" onClick={onBook}>
            <i className="ri-calendar-check-line me-1" aria-hidden="true"></i> Book via Calendly
          </button>
        )}

        {connected && canManage && (
          <div className="d-flex gap-2">
            <button type="button" className="btn btn-soft-secondary btn-sm flex-fill" disabled={sync.isPending} onClick={() => sync.mutate()}>
              {sync.isPending ? 'Syncing…' : 'Sync now'}
            </button>
            <button type="button" className="btn btn-soft-danger btn-sm flex-fill" disabled={disconnect.isPending} onClick={confirmDisconnect}>
              Disconnect
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
