import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
// bootstrap ships no type declarations for this subpath export
// @ts-expect-error -- untyped third-party module
import BootstrapModal from 'bootstrap/js/dist/modal'
import { toast } from 'react-toastify'
import { useApplyCalendlySync, useCalendlySyncPreview } from '../../modules/calendly/queries'
import {
  CALENDLY_LOCATION_KINDS,
  CALENDLY_PULL_ACTIONS,
  type CalendlyPullAction,
  type CalendlySyncApplyResult,
  type CalendlySyncDates,
  CALENDLY_SYNC_DIRECTIONS,
  type CalendlySyncDirection,
} from '../../modules/calendly/types'
import { askedLocation } from './CalendlyBookingFields'
import EventTypeDropdown from './EventTypeDropdown'
import calendlyIcon from '../../../assets/images/integrations/calendly.svg'
import '../../../assets/css/calendly-appointments.css'

interface Props {
  show: boolean
  /** Pull from Calendly, or Push to Calendly: the modal shows that one list. */
  direction: CalendlySyncDirection
  /** The dates the calendar shows. */
  dates: CalendlySyncDates
  onClose: () => void
  /** Something was synced: the calendar should reload. */
  onSynced: () => void
}

interface ModalInstance { show(): void; hide(): void; dispose(): void; _isTransitioning?: boolean; _isShown?: boolean }

const ACTION_BADGE: Record<CalendlyPullAction, { label: string; className: string }> = {
  [CALENDLY_PULL_ACTIONS.NEW]: { label: 'New', className: 'bg-success-subtle text-success' },
  [CALENDLY_PULL_ACTIONS.CHANGED]: { label: 'Changed', className: 'bg-warning-subtle text-warning' },
  [CALENDLY_PULL_ACTIONS.CANCELLED]: { label: 'Cancelled', className: 'bg-danger-subtle text-danger' },
}

const PULL_RESULT_TEXT: Record<string, string> = {
  created: 'Added to the portal',
  updated: 'Updated in the portal',
  cancelled: 'Cancelled in the portal',
  unchanged: 'Nothing to change',
}

/** "Tue, Nov 3 · 3:00 PM" in the viewer's own time. */
const when = (iso: string): string => {
  const date = new Date(iso)
  return `${date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} · ${date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`
}

const rangeLabel = ({ from, to }: CalendlySyncDates): string => {
  const fmt = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  return from === to ? fmt(from) : `${fmt(from)} – ${fmt(to)}`
}

/** "Tue · 3:00 PM" in the viewer's own time (the date is on the tile beside it). */
const timeOf = (iso: string): string => {
  const date = new Date(iso)
  return `${date.toLocaleDateString(undefined, { weekday: 'short' })} · ${date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`
}

/** A small calendar page: the month over the day. */
function DateTile({ iso }: { iso: string }) {
  const date = new Date(iso)
  return (
    <span className="cs-date" aria-hidden="true">
      <span className="cs-date-month">{date.toLocaleDateString(undefined, { month: 'short' })}</span>
      <span className="cs-date-day">{date.getDate()}</span>
    </span>
  )
}

/**
 * Pull from / Push to Calendly with a choice (Calendly v2), one way per modal: what would come in from the user's
 * Calendly (new, changed, cancelled) and which of their appointments could go
 * out to it, in the dates the calendar shows - everything that can be synced
 * ticked - then only the ticked ones are synced, each row saying how it went.
 */
export default function CalendlySyncModal({ show, direction, dates, onClose, onSynced }: Props) {
  const modalRef = useRef<HTMLDivElement>(null)
  const instance = useRef<ModalInstance | null>(null)
  // Closing, until Bootstrap says it is hidden (its backdrop fades after the dialog).
  const hiding = useRef(false)
  // The dates being looked at: set on open, kept until the fade-out has ended -
  // clearing them on close would empty the list while the modal is still fading.
  const [openDates, setOpenDates] = useState<CalendlySyncDates | null>(null)
  const preview = useCalendlySyncPreview(openDates)
  const apply = useApplyCalendlySync()

  const [pulled, setPulled] = useState<Set<string>>(new Set())
  const [pushed, setPushed] = useState<Set<number>>(new Set())
  // Of those, the ones booked under their own title and length (a one-off event type each).
  const [titled, setTitled] = useState<Set<number>>(new Set())
  const [eventTypeUri, setEventTypeUri] = useState('')
  const [location, setLocation] = useState('')
  const [result, setResult] = useState<CalendlySyncApplyResult | null>(null)

  useEffect(() => {
    if (modalRef.current && !instance.current) {
      instance.current = new BootstrapModal(modalRef.current, { backdrop: 'static', keyboard: false }) as ModalInstance
    }
    const element = modalRef.current
    return () => {
      const modal = instance.current
      instance.current = null
      const dispose = () => { try { modal?.dispose() } catch (_) { /* already gone */ } }
      // Mid-animation or still closing, Bootstrap still touches the dialog when it ends: dispose after that.
      if ((modal?._isTransitioning || hiding.current) && element) {
        element.addEventListener('shown.bs.modal', dispose, { once: true })
        element.addEventListener('hidden.bs.modal', dispose, { once: true })
      } else {
        dispose()
      }
    }
  }, [])

  useEffect(() => {
    if (show) {
      setOpenDates(dates)
      instance.current?.show()
    } else {
      if (instance.current?._isShown) hiding.current = true
      instance.current?.hide()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show])

  // Fully hidden: now the list can go.
  useEffect(() => {
    const element = modalRef.current
    if (!element) return
    const hidden = () => {
      hiding.current = false
      setOpenDates(null)
    }
    element.addEventListener('hidden.bs.modal', hidden)
    return () => element.removeEventListener('hidden.bs.modal', hidden)
  }, [])

  // A fresh preview: tick everything that can be synced, forget the last result.
  const data = preview.data
  useEffect(() => {
    if (!data) return
    setPulled(new Set(data.pull.map((item) => item.uri)))
    setPushed(new Set(data.push.filter((item) => item.pushable).map((item) => item.appointment_id)))
    setTitled(new Set())
    setEventTypeUri(data.event_types[0]?.uri ?? '')
    setLocation('')
    setResult(null)
  }, [data])

  const eventType = data?.event_types.find((type) => type.uri === eventTypeUri)
  const asked = askedLocation(eventType, '')
  const canPush = !!eventType
  const pushable = useMemo(() => data?.push.filter((item) => item.pushable) ?? [], [data])
  const selectedPush = canPush ? [...pushed] : []
  const pulling = direction === CALENDLY_SYNC_DIRECTIONS.PULL
  // Only this modal's own list is sent; the other way is left alone.
  const sentPull = pulling ? [...pulled] : []
  const sentPush = pulling ? [] : selectedPush
  const count = sentPull.length + sentPush.length
  const done = result !== null

  const toggle = <T,>(set: Set<T>, value: T, update: (next: Set<T>) => void) => {
    const next = new Set(set)
    if (next.has(value)) next.delete(value)
    else next.add(value)
    update(next)
  }

  const submit = () =>
    apply.mutate(
      {
        dates,
        selection: {
          pull: sentPull,
          push: sentPush,
          push_use_title: sentPush.filter((id) => titled.has(id)),
          calendly_event_type_uri: sentPush.length ? eventTypeUri : null,
          calendly_location_kind: asked,
          calendly_location: asked ? location : null,
        },
      },
      {
        onSuccess: (res) => {
          setResult(res)
          const failed = res.pull.filter((r) => r.result === 'failed').length + res.push.filter((r) => !r.ok).length
          const total = res.pull.length + res.push.length
          toast.success(failed ? `Calendly sync finished: ${total - failed} synced, ${failed} not synced` : `Calendly synced: ${total} done`)
          onSynced()
        },
        onError: (error) => toast.error((error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Calendly could not be synced'),
      }
    )

  const pullOutcome = (uri: string) => result?.pull.find((r) => r.uri === uri)
  const pushOutcome = (id: number) => result?.push.find((r) => r.appointment_id === id)
  const listed = data ? (pulling ? data.pull.length : data.push.length) : 0

  const body = (
    <div className="modal fade calendly-sync-modal" ref={modalRef} tabIndex={-1} aria-labelledby="calendly-sync-title" aria-hidden="true">
      <div className="modal-dialog modal-dialog-centered modal-lg">
        <div className="modal-content">
          <div className="cs-header">
            <span className={`cs-header-icon ${pulling ? 'is-pull' : 'is-push'}`} aria-hidden="true">
              <img src={calendlyIcon} alt="" width={20} height={20} />
              <i className={pulling ? 'ri-arrow-down-line' : 'ri-arrow-up-line'}></i>
            </span>
            <div className="flex-grow-1 min-w-0">
              <h5 id="calendly-sync-title" className="modal-title cs-title-main">{pulling ? 'Pull from Calendly' : 'Push to Calendly'}</h5>
              <div className="cs-header-sub">
                {pulling
                  ? 'Meetings in your Calendly that are new, changed or cancelled.'
                  : 'Appointments you made that are not in your Calendly yet.'}
              </div>
            </div>
            <span className="cs-range" title="The dates the calendar shows">
              <i className="ri-calendar-2-line" aria-hidden="true"></i>{rangeLabel(dates)}
            </span>
            <button type="button" className="btn-close" aria-label="Close" onClick={onClose}></button>
          </div>

          <div className="modal-body cs-body">
            {preview.isLoading && (
              <div className="placeholder-glow d-flex flex-column gap-2" aria-label="Checking Calendly…">
                {[0, 1, 2].map((i) => <span key={i} className="placeholder cs-skeleton" />)}
              </div>
            )}
            {preview.isError && (
              <div className="alert alert-danger mb-0 fs-13">
                {(preview.error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Calendly could not be checked. Try again.'}
              </div>
            )}

            {data && pulling && (
              <section aria-labelledby="calendly-sync-title">
                {data.pull.length === 0 ? (
                  <div className="cs-empty">
                    <span className="cs-empty-icon"><i className="ri-inbox-archive-line" aria-hidden="true"></i></span>
                    <div className="cs-empty-title">All caught up</div>
                    <div>Nothing new in Calendly for these dates.</div>
                  </div>
                ) : (
                  <>
                    <div className="cs-toolbar">
                      <span className="cs-count">{data.pull.length} {data.pull.length === 1 ? 'meeting' : 'meetings'} · <strong>{pulled.size} selected</strong></span>
                      {!done && (
                        <label className="cs-select-all form-check mb-0">
                          <input
                            type="checkbox"
                            className="form-check-input"
                            aria-label="Select all from Calendly"
                            checked={pulled.size === data.pull.length}
                            onChange={(e) => setPulled(e.target.checked ? new Set(data.pull.map((i) => i.uri)) : new Set())}
                          />
                          <span aria-hidden="true">Select all</span>
                        </label>
                      )}
                    </div>
                    <ul className="cs-list list-unstyled mb-0">
                      {data.pull.map((item) => {
                        const badge = ACTION_BADGE[item.action]
                        const outcome = pullOutcome(item.uri)
                        const picked = pulled.has(item.uri)
                        return (
                          <li key={item.uri} className={`cs-row ${picked ? 'is-picked' : ''}`}>
                            <input
                              type="checkbox"
                              className="form-check-input cs-check"
                              aria-label={item.title ?? 'Calendly meeting'}
                              checked={picked}
                              disabled={done}
                              onChange={() => toggle(pulled, item.uri, setPulled)}
                            />
                            <DateTile iso={item.start_time} />
                            <div className="flex-grow-1 min-w-0">
                              <div className="cs-title text-truncate">{item.title ?? 'Calendly meeting'}</div>
                              <div className="cs-meta">
                                <span><i className="ri-time-line" aria-hidden="true"></i>{timeOf(item.start_time)}</span>
                                {item.action === CALENDLY_PULL_ACTIONS.CHANGED && item.previous_start_time && (
                                  <span className="cs-was">was {when(item.previous_start_time)}</span>
                                )}
                                {item.people.length > 0 && (
                                  <span className="text-truncate"><i className="ri-user-3-line" aria-hidden="true"></i>{item.people.join(', ')}</span>
                                )}
                              </div>
                            </div>
                            {outcome ? (
                              outcome.result === 'failed'
                                ? <span className="cs-outcome is-failed"><i className="ri-close-circle-fill"></i>{outcome.message || 'Could not sync'}</span>
                                : <span className="cs-outcome is-done"><i className="ri-checkbox-circle-fill"></i>{PULL_RESULT_TEXT[outcome.result]}</span>
                            ) : (
                              <span className={`cs-badge ${badge.className}`}>{badge.label}</span>
                            )}
                          </li>
                        )
                      })}
                    </ul>
                  </>
                )}
              </section>
            )}

            {data && !pulling && (
              <section aria-labelledby="calendly-sync-title">
                {data.push.length === 0 ? (
                  <div className="cs-empty">
                    <span className="cs-empty-icon"><i className="ri-checkbox-circle-line" aria-hidden="true"></i></span>
                    <div className="cs-empty-title">All caught up</div>
                    <div>Every appointment you made in these dates is in Calendly.</div>
                  </div>
                ) : (
                  <>
                    {pushable.length > 0 && (
                      data.event_types.length > 0 ? (
                        <div className="cs-settings">
                          <div className="row g-3 align-items-end">
                            <div className={asked ? 'col-md-6' : 'col-12'}>
                              <label htmlFor="cs-event-type" className="cs-label">Book on event type</label>
                              {data.event_types.length > 1 ? (
                                <EventTypeDropdown inputId="cs-event-type" eventTypes={data.event_types} value={eventTypeUri} disabled={done} onChange={setEventTypeUri} />
                              ) : (
                                <div id="cs-event-type" className="cs-type">
                                  <i className="ri-calendar-event-line" aria-hidden="true"></i>
                                  <span className="fw-semibold">{data.event_types[0].name}</span>
                                  <span className="cs-type-length">{data.event_types[0].duration} min</span>
                                </div>
                              )}
                            </div>
                            {asked && (
                              <div className="col-md-6">
                                <label htmlFor="cs-location" className="cs-label">
                                  {asked === CALENDLY_LOCATION_KINDS.PHONE_CALL ? 'Phone number to call' : 'Where to meet'}
                                </label>
                                <input id="cs-location" className="form-control" value={location} disabled={done} onChange={(e) => setLocation(e.target.value)} />
                              </div>
                            )}
                          </div>
                          <div className="cs-hint">
                            <i className="ri-information-line" aria-hidden="true"></i>
                            <span>Each one is booked at its own time for the event type's length, and the time must be open in your Calendly. Tick "Use this title in Calendly" on a meeting to book it with its own title and whole time slot instead.</span>
                          </div>
                        </div>
                      ) : (
                        <div className="alert alert-warning py-2 fs-12">Your Calendly has no event type switched on, so nothing can be added to it.</div>
                      )
                    )}
                    <div className="cs-toolbar">
                      <span className="cs-count">{data.push.length} {data.push.length === 1 ? 'appointment' : 'appointments'} · <strong>{selectedPush.length} selected</strong></span>
                      {pushable.length > 0 && canPush && !done && (
                        <label className="cs-select-all form-check mb-0">
                          <input
                            type="checkbox"
                            className="form-check-input"
                            aria-label="Select all to Calendly"
                            checked={pushed.size === pushable.length}
                            onChange={(e) => setPushed(e.target.checked ? new Set(pushable.map((i) => i.appointment_id)) : new Set())}
                          />
                          <span aria-hidden="true">Select all</span>
                        </label>
                      )}
                    </div>
                    <ul className="cs-list list-unstyled mb-0">
                      {data.push.map((item) => {
                        const outcome = pushOutcome(item.appointment_id)
                        const picked = item.pushable && canPush && pushed.has(item.appointment_id)
                        return (
                          <li key={item.appointment_id} className={`cs-row ${item.pushable ? '' : 'is-disabled'} ${picked ? 'is-picked' : ''}`}>
                            <input
                              type="checkbox"
                              className="form-check-input cs-check"
                              aria-label={item.title ?? 'Appointment'}
                              checked={picked}
                              disabled={!item.pushable || !canPush || done}
                              onChange={() => toggle(pushed, item.appointment_id, setPushed)}
                            />
                            <DateTile iso={item.start_time} />
                            <div className="flex-grow-1 min-w-0">
                              <div className="cs-title text-truncate">{item.title ?? 'Appointment'}</div>
                              <div className="cs-meta">
                                <span><i className="ri-time-line" aria-hidden="true"></i>{timeOf(item.start_time)}</span>
                                {item.people.length > 0 && (
                                  <span className="text-truncate"><i className="ri-user-3-line" aria-hidden="true"></i>{item.people.join(', ')}</span>
                                )}
                              </div>
                              {!item.pushable && item.reason && <div className="cs-reason"><i className="ri-error-warning-line" aria-hidden="true"></i>{item.reason}</div>}
                            </div>
                            {item.pushable && canPush && !outcome && (
                              <label className={`cs-use-title ${titled.has(item.appointment_id) ? 'is-on' : ''}`} title="Book it in Calendly with this title and its whole time slot">
                                <input
                                  type="checkbox"
                                  className="form-check-input"
                                  checked={titled.has(item.appointment_id)}
                                  disabled={!pushed.has(item.appointment_id) || done}
                                  onChange={() => toggle(titled, item.appointment_id, setTitled)}
                                />
                                <span>Use this title in Calendly</span>
                              </label>
                            )}
                            {outcome && (
                              outcome.ok
                                ? <span className="cs-outcome is-done"><i className="ri-checkbox-circle-fill"></i>Added to Calendly</span>
                                : <span className="cs-outcome is-failed"><i className="ri-close-circle-fill"></i>{outcome.message || 'Could not add'}</span>
                            )}
                          </li>
                        )
                      })}
                    </ul>
                  </>
                )}
              </section>
            )}
          </div>

          <div className="cs-footer">
            <span className="cs-footer-note">
              {done
                ? 'Done - the calendar is up to date.'
                : listed > 0 ? `${count} of ${listed} will be ${pulling ? 'pulled into the portal' : 'added to Calendly'}` : ''}
            </span>
            <div className="d-flex gap-2">
              <button type="button" className="btn cs-btn cs-btn-secondary" onClick={onClose}>{done ? 'Close' : 'Cancel'}</button>
              {!done && (
                <button type="button" className="btn cs-btn cs-btn-primary" onClick={submit} disabled={!data || count === 0 || apply.isPending}>
                  {apply.isPending
                    ? <><span className="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>{pulling ? 'Pulling…' : 'Pushing…'}</>
                    : <><i className={`${pulling ? 'ri-download-2-line' : 'ri-upload-2-line'} me-1`}></i>{pulling ? 'Pull' : 'Push'} selected ({count})</>}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(body, document.body)
}
