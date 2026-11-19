import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-toastify'
import { queryKeys } from '../../lib/query'
import { useCalendlyStatus } from '../../modules/calendly/queries'
import { connectCalendly, disconnectCalendly, syncCalendlyDirected } from '../../modules/calendly/services'
import type { CalendlySyncDates, CalendlySyncDirection } from '../../modules/calendly/types'
import { settingsPath } from '../../config/settingsSections'
import ConfirmationModal from '../Common/Modals/ConfirmationModal'
import CalendlySyncModal, { syncSummary } from './CalendlySyncModal'
import calendlyLogo from '../../../assets/images/integrations/calendly.svg'

type Props = {
  /** Calendly meetings were brought in - reload the calendar. */
  onSynced: () => void
  /** The dates the calendar shows (Month / Week / Day), read when Sync now opens; none = this month. */
  getSyncDates?: () => CalendlySyncDates | null
  /** Sends the browser to Calendly's sign-in (replaceable in tests). */
  redirect?: (url: string) => void
}

const errorMessage = (error: unknown, fallback: string) =>
  (error as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback

/**
 * The partner's Calendly account on the Appointments page. The host, WLP or
 * certified partner account itself connects, reconnects and disconnects it
 * here (Calendly's sign-in, through the app keys saved in Settings > Calendly);
 * it and its staff sync it. Booking into it is the "Sync with Calendly" tick
 * in Add Appointment. Calendly sends the browser back here after sign-in.
 */
export default function CalendlyConnectCard({ onSynced, getSyncDates, redirect = (url) => window.location.assign(url) }: Props) {
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const { data: status } = useCalendlyStatus()
  const refreshStatus = () => queryClient.invalidateQueries({ queryKey: queryKeys.calendly.all })
  // On the way to Calendly's sign-in: the button stays busy until the browser leaves.
  const [redirecting, setRedirecting] = useState(false)
  const [askDisconnect, setAskDisconnect] = useState(false)

  // Back from Calendly's sign-in: say how it went, then drop the flag from the URL.
  useEffect(() => {
    const result = searchParams.get('calendly')
    if (!result) return
    if (result === 'connected') {
      toast.success('Calendly connected')
      refreshStatus()
      onSynced()
    } else if (result === 'in_use') {
      // That Calendly account is connected in FCH already (another partner or a borrower).
      toast.error('This Calendly account is already connected in the portal (to another partner or a borrower). Disconnect it there first, or use a different Calendly account.')
    } else {
      toast.error('Calendly could not be connected')
    }
    const next = new URLSearchParams(searchParams)
    next.delete('calendly')
    setSearchParams(next, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  const connect = useMutation({
    mutationFn: () => connectCalendly(),
    onSuccess: (url) => {
      setRedirecting(true)
      redirect(url)
    },
    onError: (error) => toast.error(errorMessage(error, 'Could not start connecting Calendly')),
  })

  const disconnect = useMutation({
    mutationFn: () => disconnectCalendly(),
    onSuccess: () => {
      toast.success('Calendly disconnected')
      setAskDisconnect(false)
      refreshStatus()
    },
    onError: (error) => toast.error(errorMessage(error, 'Could not disconnect Calendly')),
  })

  // Sync now: the way and the dates are picked in the modal.
  const [syncDates, setSyncDates] = useState<CalendlySyncDates | null>(null)
  const [askSync, setAskSync] = useState(false)
  const openSync = () => {
    setSyncDates(getSyncDates?.() ?? null)
    setAskSync(true)
  }

  const sync = useMutation({
    mutationFn: (direction: CalendlySyncDirection) => syncCalendlyDirected(direction, syncDates),
    onSuccess: (result) => {
      setAskSync(false)
      if (result.failed > 0) {
        const first = result.errors[0]
        toast.warning(`${syncSummary(result)}. ${result.failed} not sent to Calendly${first ? ` - ${first.subject ? `"${first.subject}": ` : ''}${first.message}` : ''}`)
      } else {
        toast.success(`Calendly synced: ${syncSummary(result)}`)
      }
      refreshStatus()
      onSynced()
    },
    onError: (error) => toast.error(errorMessage(error, 'Calendly sync failed')),
  })

  // No sync by itself - not on opening the page, nor on coming back from connecting:
  // an appointment is made from a Calendly meeting only when someone presses Sync now.

  const connected = Boolean(status?.connected)
  const configured = status?.configured !== false
  // The host, WLP or certified partner account itself: connects and disconnects here.
  const canManage = Boolean(status?.can_manage)
  // The account and its staff.
  const canSync = Boolean(status?.can_sync)
  const connecting = connect.isPending || redirecting

  if (!status || (!canManage && !connected)) {
    return null
  }

  return (
    <div className="card mb-3 calendly-card">
      <div className="card-body">
        <div className="d-flex align-items-center mb-2">
          <img src={calendlyLogo} alt="" width={20} height={20} className="me-2 flex-shrink-0" aria-hidden="true" />
          <h6 className="mb-0 flex-grow-1">Calendly</h6>
          {connected && <span className="badge bg-success-subtle text-success">Connected</span>}
          {!connected && status.needs_reconnect && <span className="badge bg-warning-subtle text-warning">Expired</span>}
          {!connected && !configured && <span className="badge bg-secondary-subtle text-secondary">Not set up</span>}
        </div>

        {connected && (
          <p className="text-muted fs-12 mb-2">
            {status.name}
            {status.email ? ` · ${status.email}` : ''}
          </p>
        )}

        {connected && canSync && status.webhooks_active === false && (
          <p className="text-warning fs-12 mb-2">
            Webhooks are not active - new Calendly bookings appear after a sync (hourly, or Sync now).
          </p>
        )}

        {connected && canSync && status.last_synced_at && (
          <p className="text-muted fs-12 mb-2">Last synced {new Date(status.last_synced_at).toLocaleString()}</p>
        )}

        {!connected && canManage && !configured && (
          <>
            <p className="text-muted fs-12 mb-2">
              Add your Calendly app keys (Client ID and Client Secret) in Settings first, then connect here.
            </p>
            <Link to={settingsPath('calendly')} className="btn btn-soft-primary w-100">
              Add keys in Settings
            </Link>
          </>
        )}

        {!connected && canManage && configured && (
          <>
            <p className="text-muted fs-12 mb-2">
              Sign in to your Calendly to see its meetings here and book into it. Your clients book with it too.
            </p>
            <button type="button" className="btn btn-primary w-100" disabled={connecting} onClick={() => connect.mutate()}>
              {connecting ? (
                <>
                  <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                  Connecting…
                </>
              ) : status.needs_reconnect ? 'Reconnect Calendly' : 'Connect Calendly'}
            </button>
            <p className="text-muted fs-11 mt-2 mb-0">
              Calendly signs in with the account open in this browser. To connect a different Calendly account, log out at calendly.com first.
            </p>
          </>
        )}

        {connected && (canSync || canManage) && (
          <div className="d-flex gap-2">
            {canSync && (
              <button type="button" className="btn btn-soft-secondary btn-sm flex-grow-1" disabled={sync.isPending} onClick={openSync}>
                {sync.isPending ? 'Syncing…' : 'Sync now'}
              </button>
            )}
            {canManage && (
              <button type="button" className="btn btn-soft-danger btn-sm" disabled={disconnect.isPending} onClick={() => setAskDisconnect(true)}>
                Disconnect
              </button>
            )}
          </div>
        )}
      </div>

      {canSync && (
        <CalendlySyncModal
          show={askSync}
          onClose={() => setAskSync(false)}
          onSubmit={(direction) => sync.mutate(direction)}
          loading={sync.isPending}
          dates={syncDates}
        />
      )}

      {canManage && (
        <ConfirmationModal
          show={askDisconnect}
          onHide={() => setAskDisconnect(false)}
          onConfirm={() => disconnect.mutate()}
          loading={disconnect.isPending}
          title="Disconnect Calendly?"
          message="Calendly stops syncing and booking for your team and your clients. Meetings already brought in stay on the calendar. Your app keys stay saved in Settings."
          confirmText="Yes, disconnect"
          variant="danger"
          iconNode={
            // Calendly's logo: the integration being disconnected.
            <div className="avatar-lg d-inline-block" aria-hidden="true">
              <span className="avatar-title bg-light rounded-circle">
                <img src={calendlyLogo} alt="" style={{ width: 44, height: 44 }} />
              </span>
            </div>
          }
        />
      )}
    </div>
  )
}
