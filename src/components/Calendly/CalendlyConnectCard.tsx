import { useEffect, useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-toastify'
import { queryKeys } from '../../lib/query'
import { useCalendlyStatus } from '../../modules/calendly/queries'
import { connectCalendly, disconnectCalendly, syncCalendly } from '../../modules/calendly/services'
import type { CalendlyConnectPayload } from '../../modules/calendly/types'
import CalendlyConnectModal from './CalendlyConnectModal'
import ConfirmationModal from '../Common/Modals/ConfirmationModal'

type Props = {
  /** Calendly meetings were brought in - reload the calendar. */
  onSynced: () => void
  /** Sends the browser to Calendly's sign-in (replaceable in tests). */
  redirect?: (url: string) => void
}

type ApiError = { response?: { status?: number; data?: { message?: string; errors?: Record<string, string | string[]> } } }

const errorMessage = (error: unknown, fallback: string) => (error as ApiError)?.response?.data?.message || fallback

/**
 * Your own Calendly on the Appointments page - your partner's (shared by its
 * team): whether it is connected; connecting it with your own Calendly OAuth
 * app (the Connect popup), syncing and disconnecting it. Booking into it is
 * the "Sync with Calendly" tick in Add Appointment.
 */
export default function CalendlyConnectCard({ onSynced, redirect = (url) => window.location.assign(url) }: Props) {
  const queryClient = useQueryClient()
  const { data: status } = useCalendlyStatus()
  const refreshStatus = () => queryClient.invalidateQueries({ queryKey: queryKeys.calendly.all })
  const [showConnect, setShowConnect] = useState(false)
  const [keyErrors, setKeyErrors] = useState<Partial<Record<keyof CalendlyConnectPayload, string>>>({})
  // Saved: the browser is on its way to Calendly - keep the popup busy until it leaves.
  const [redirecting, setRedirecting] = useState(false)
  const [askDisconnect, setAskDisconnect] = useState(false)

  const connect = useMutation({
    mutationFn: connectCalendly,
    onSuccess: (url) => {
      setRedirecting(true)
      redirect(url)
    },
    onError: (error) => {
      const fieldErrors = (error as ApiError)?.response?.data?.errors
      if (fieldErrors) {
        setKeyErrors(Object.fromEntries(Object.entries(fieldErrors).map(([field, value]) => [field, [].concat(value as never)[0]])))
      } else {
        toast.error(errorMessage(error, 'Could not start connecting Calendly'))
      }
    },
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
      setAskDisconnect(false)
      refreshStatus()
    },
    onError: (error) => toast.error(errorMessage(error, 'Could not disconnect Calendly')),
  })

  // Opening (or reloading) the page brings in meetings booked or missed in
  // Calendly since the last sync - once, quietly, and only when connected.
  const autoSynced = useRef(false)
  const autoSync = useMutation({
    mutationFn: syncCalendly,
    onSuccess: () => {
      refreshStatus()
      onSynced()
    },
    // A failure shows on the card (e.g. Expired) once the status is asked again.
    onError: () => refreshStatus(),
  })

  const connected = Boolean(status?.connected)
  const canManage = Boolean(status?.can_manage)

  useEffect(() => {
    if (connected && canManage && !autoSynced.current) {
      autoSynced.current = true
      autoSync.mutate()
    }
  }, [connected, canManage, autoSync])

  if (!status || (!canManage && !connected)) {
    return null
  }

  const openConnect = () => {
    setKeyErrors({})
    setShowConnect(true)
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
              Connect your own Calendly to see its meetings here and book into it.
            </p>
            <button type="button" className="btn btn-primary w-100" onClick={openConnect}>
              {status.needs_reconnect ? 'Reconnect Calendly' : 'Connect Calendly'}
            </button>
          </>
        )}

        {connected && canManage && (
          <div className="d-flex gap-2">
            <button type="button" className="btn btn-soft-secondary btn-sm flex-fill" disabled={sync.isPending} onClick={() => sync.mutate()}>
              {sync.isPending || autoSync.isPending ? 'Syncing…' : 'Sync now'}
            </button>
            <button type="button" className="btn btn-soft-danger btn-sm flex-fill" disabled={disconnect.isPending} onClick={() => setAskDisconnect(true)}>
              Disconnect
            </button>
          </div>
        )}
      </div>

      <ConfirmationModal
        show={askDisconnect}
        onHide={() => setAskDisconnect(false)}
        onConfirm={() => disconnect.mutate()}
        loading={disconnect.isPending}
        title="Disconnect Calendly?"
        message="Your Calendly stops syncing and booking. Meetings already brought in stay on the calendar; your saved keys stay for reconnecting."
        confirmText="Yes, disconnect"
        variant="danger"
      />

      {showConnect && (
        <CalendlyConnectModal
          status={status}
          saving={connect.isPending || redirecting}
          errors={keyErrors}
          onClose={() => setShowConnect(false)}
          onSubmit={(keys) => {
            setKeyErrors({})
            connect.mutate(keys)
          }}
        />
      )}
    </div>
  )
}
