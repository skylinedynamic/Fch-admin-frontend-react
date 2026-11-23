import { useEffect, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useCompleteCalendlyConnection, type CalendlyCallbackQuery } from '../../modules/calendly'
import calendlyWordmark from '../../../assets/images/logo/calendly.png'
import calendlyIcon from '../../../assets/images/integrations/calendly.svg'
import '../../../assets/css/calendly-appointments.css'

interface Props {
  /** Sends the browser on - possibly to another portal (replaced in tests). */
  redirect?: (url: string) => void
}

/**
 * Where Calendly sends people back after they connect (Calendly v2). It is on
 * the partner's own portal domain - never the API's address, so a white-label
 * partner's people never see the host's. Hands Calendly's answer to the API,
 * which connects the account and says where to go next: Appointments here
 * for staff, the borrower portal for clients. Needs no sign-in.
 */
export default function CalendlyCallback({ redirect = (url) => window.location.replace(url) }: Props) {
  const [params] = useSearchParams()
  const complete = useCompleteCalendlyConnection()
  // The state is single-use: send it once, even when React runs effects twice.
  const sent = useRef(false)

  useEffect(() => {
    if (sent.current) return
    sent.current = true

    const query: CalendlyCallbackQuery = {}
    for (const key of ['code', 'state', 'error'] as const) {
      const value = params.get(key)
      if (value) query[key] = value
    }
    complete.mutate(query, { onSuccess: (url) => redirect(url) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const failed = complete.isError

  return (
    <main className="calendly-callback">
      <section className={`cbk-card ${failed ? 'is-failed' : ''}`} aria-live="polite" aria-busy={!failed}>
        {/* Your calendar ↔ Calendly, with the link travelling between them. */}
        <div className="cbk-link" aria-hidden="true">
          <span className="cbk-node"><i className="ri-calendar-check-line"></i></span>
          <span className="cbk-path">
            {failed ? <i className="ri-close-line cbk-broken"></i> : <><span /><span /><span /></>}
          </span>
          <span className="cbk-node is-calendly"><img src={calendlyIcon} alt="" width={26} height={26} /></span>
        </div>

        {failed ? (
          <>
            <h1 className="cbk-title">Calendly could not be connected</h1>
            <p className="cbk-text">Nothing was changed. Try again from your Appointments page.</p>
            <Link to="/appointments" className="btn btn-primary cbk-btn">
              <i className="ri-arrow-left-line align-middle me-1" aria-hidden="true"></i>Back to Appointments
            </Link>
          </>
        ) : (
          <>
            <h1 className="cbk-title">Connecting Calendly…</h1>
            <p className="cbk-text">This takes a moment. You'll be taken back to your appointments.</p>
            <div className="cbk-progress" role="progressbar" aria-label="Connecting Calendly"><span /></div>
          </>
        )}

        <footer className="cbk-foot">
          <span>Secured by</span>
          <img src={calendlyWordmark} alt="Calendly" />
        </footer>
      </section>
    </main>
  )
}
