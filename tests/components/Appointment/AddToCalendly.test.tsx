import { afterEach, describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '../../mocks/server'
import { renderWithProviders, screen, waitFor } from '../../test-utils'
import AddToCalendly from '../../../src/components/Appointment/AddToCalendly'
import { CALENDLY_BOOKING_MODES } from '../../../src/modules/calendly/types'

const zoom = { uri: 'ET1', name: '30 Minute Meeting', duration: 30, locations: [{ kind: 'zoom_conference' }], asks_location: false }

afterEach(() => server.resetHandlers())

/** As the form's other PrimeReact dropdowns: open it, click the panel item. */
async function pickEventType(container: ParentNode, option: string) {
  await userEvent.click(container.querySelector('.calendly-event-type-dropdown') as HTMLElement)
  const item = await waitFor(() => {
    const found = Array.from(document.body.querySelectorAll('.p-dropdown-panel .p-dropdown-item')).find((el) => el.textContent?.trim().startsWith(option))
    if (!found) throw new Error(`no "${option}" option`)
    return found as HTMLElement
  })
  await userEvent.click(item)
}

describe('AddToCalendly (Calendly v2: one appointment at a time)', () => {
  it('is not offered when nobody who could host it is connected', async () => {
    server.use(http.post('*/common/calendly/booking-options', () => HttpResponse.json({ status: true, data: { mode: CALENDLY_BOOKING_MODES.NONE, host: null, event_types: [] } })))
    renderWithProviders(<AddToCalendly appointmentId={12} attendees={[{ user_id: 3 }]} onAdded={vi.fn()} />)

    await waitFor(() => expect(screen.queryByRole('button', { name: /add to calendly/i })).not.toBeInTheDocument())
  })

  it('books it with the chosen event type', async () => {
    server.use(http.post('*/common/calendly/booking-options', () => HttpResponse.json({ status: true, data: { mode: CALENDLY_BOOKING_MODES.OWN, host: { user_id: 1, name: 'Me' }, event_types: [zoom] } })))
    let body: any = null
    server.use(http.post('*/common/appointments/12/calendly', async ({ request }) => {
      body = await request.json()
      return HttpResponse.json({ status: true, message: 'Added to Calendly.', data: { id: 12, is_calendly: true } })
    }))
    const onAdded = vi.fn()
    renderWithProviders(<AddToCalendly appointmentId={12} attendees={[{ user_id: 3 }]} onAdded={onAdded} />)

    await userEvent.click(await screen.findByRole('button', { name: /add to calendly/i }))

    await waitFor(() => expect(onAdded).toHaveBeenCalled())
    expect(body).toMatchObject({ calendly_event_type_uri: 'ET1' })
  })

  it('shows why Calendly refused, beside the button', async () => {
    server.use(http.post('*/common/calendly/booking-options', () => HttpResponse.json({ status: true, data: { mode: CALENDLY_BOOKING_MODES.OWN, host: { user_id: 1, name: 'Me' }, event_types: [zoom] } })))
    server.use(http.post('*/common/appointments/12/calendly', () => HttpResponse.json({
      status: false, message: 'The given data was invalid.', errors: { appointment_date: ['Calendly refused the request. The selected time is no longer available'] },
    }, { status: 422 })))
    renderWithProviders(<AddToCalendly appointmentId={12} attendees={[{ user_id: 3 }]} onAdded={vi.fn()} />)

    await userEvent.click(await screen.findByRole('button', { name: /add to calendly/i }))

    expect(await screen.findByText(/no longer available/i)).toBeInTheDocument()
  })

  it('books it on the event type picked from the dropdown', async () => {
    const thirty = { ...zoom, uri: 'ET9', name: 'Demo', duration: 45 }
    server.use(http.post('*/common/calendly/booking-options', () => HttpResponse.json({ status: true, data: { mode: CALENDLY_BOOKING_MODES.OWN, host: { user_id: 1, name: 'Me' }, event_types: [zoom, thirty] } })))
    let body: any = null
    server.use(http.post('*/common/appointments/12/calendly', async ({ request }) => {
      body = await request.json()
      return HttpResponse.json({ status: true, message: 'Added to Calendly.', data: { id: 12, is_calendly: true } })
    }))
    const { container } = renderWithProviders(<AddToCalendly appointmentId={12} attendees={[{ user_id: 3 }]} onAdded={vi.fn()} />)

    await screen.findByRole('button', { name: /add to calendly/i })
    await pickEventType(container, 'Demo')
    await userEvent.click(screen.getByRole('button', { name: /add to calendly/i }))

    await waitFor(() => expect(body).toMatchObject({ calendly_event_type_uri: 'ET9' }))
  })
})
