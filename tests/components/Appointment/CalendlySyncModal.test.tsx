import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { toast } from 'react-toastify'
import { server } from '../../mocks/server'
import { renderWithProviders, screen, waitFor, within } from '../../test-utils'
import CalendlySyncModal from '../../../src/components/Appointment/CalendlySyncModal'
import { CALENDLY_SYNC_DIRECTIONS, type CalendlySyncDirection } from '../../../src/modules/calendly/types'

vi.mock('react-toastify', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }))
vi.mock('bootstrap/js/dist/modal', () => ({ default: class { show = vi.fn(); hide = vi.fn(); dispose = vi.fn() } }))

const DATES = { from: '2026-11-01', to: '2026-11-30' }
const zoom = { uri: 'ET1', name: '30 Minute Meeting', duration: 30, locations: [{ kind: 'zoom_conference' }], asks_location: false }

const preview = {
  pull: [
    { uri: 'E-NEW', action: 'new', title: 'Intro call', start_time: '2026-11-03T15:00:00Z', end_time: '2026-11-03T15:30:00Z', people: ['guest@example.com'], appointment_id: null, previous_start_time: null },
    { uri: 'E-MOVED', action: 'changed', title: 'Review', start_time: '2026-11-04T11:00:00Z', end_time: '2026-11-04T11:30:00Z', people: ['Ada Lovelace'], appointment_id: 5, previous_start_time: '2026-11-04T10:00:00Z' },
    { uri: 'E-GONE', action: 'cancelled', title: 'Old call', start_time: '2026-11-05T09:00:00Z', end_time: '2026-11-05T09:30:00Z', people: [], appointment_id: 6, previous_start_time: '2026-11-05T09:00:00Z' },
  ],
  push: [
    { appointment_id: 7, title: 'Business review', start_time: '2026-11-20T10:00:00Z', end_time: '2026-11-20T10:30:00Z', people: ['Ada Lovelace'], pushable: true, reason: null },
    { appointment_id: 8, title: 'Kick-off', start_time: '2026-11-02T10:00:00Z', end_time: '2026-11-02T10:30:00Z', people: ['Grace Hopper'], pushable: false, reason: 'Already happened - Calendly cannot book a past time.' },
  ],
  event_types: [zoom],
}

function serve(data: object = preview) {
  const bodies: any[] = []
  server.use(
    http.post('*/common/calendly/sync/preview', () => HttpResponse.json({ status: true, data })),
    http.post('*/common/calendly/sync', async ({ request }) => {
      bodies.push(await request.json())
      return HttpResponse.json({ status: true, data: {
        pull: [{ uri: 'E-NEW', result: 'created' }, { uri: 'E-GONE', result: 'cancelled' }],
        push: [{ appointment_id: 7, ok: false, message: 'That time is not open in Calendly.' }],
      } })
    }),
  )
  return bodies
}

const renderModal = (direction: CalendlySyncDirection, onSynced = vi.fn()) => {
  renderWithProviders(<CalendlySyncModal show direction={direction} dates={DATES} onClose={vi.fn()} onSynced={onSynced} />)
  return { onSynced }
}

const box = (name: RegExp) => screen.getByRole('checkbox', { name, hidden: true })
const button = (name: RegExp) => screen.getByRole('button', { name, hidden: true })
const row = (title: string) => screen.getByText(title, { selector: '.cs-title' }).closest('li') as HTMLElement
const useTitle = (title: string) => within(row(title)).getByRole('checkbox', { name: 'Use this title in Calendly', hidden: true })

beforeEach(() => vi.clearAllMocks())
afterEach(() => server.resetHandlers())

describe('CalendlySyncModal - Pull from Calendly', () => {
  it('lists only what would come in from Calendly, all ticked', async () => {
    serve()
    renderModal(CALENDLY_SYNC_DIRECTIONS.PULL)

    expect(await screen.findByText('Intro call')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Pull from Calendly', hidden: true })).toBeInTheDocument()
    expect(screen.getByText('New')).toBeInTheDocument()
    expect(screen.getByText('Changed')).toBeInTheDocument()
    expect(screen.getByText('Cancelled')).toBeInTheDocument()
    expect(box(/intro call/i)).toBeChecked()
    expect(box(/^review$/i)).toBeChecked()
    // Nothing about pushing.
    expect(screen.queryByText('Business review')).not.toBeInTheDocument()
    expect(screen.queryByText('30 Minute Meeting')).not.toBeInTheDocument()
  })

  it('pulls only what stays ticked - and pushes nothing - then shows how each went', async () => {
    const bodies = serve()
    const { onSynced } = renderModal(CALENDLY_SYNC_DIRECTIONS.PULL)
    await screen.findByText('Intro call')

    await userEvent.click(box(/^review$/i))
    await userEvent.click(button(/pull selected \(2\)/i))

    await waitFor(() => expect(bodies).toHaveLength(1))
    expect(bodies[0]).toMatchObject({ ...DATES, pull: ['E-NEW', 'E-GONE'], push: [] })
    expect((await screen.findAllByText(/added|cancelled in the portal/i)).length).toBeGreaterThan(0)
    expect(onSynced).toHaveBeenCalled()
    expect(toast.success).toHaveBeenCalled()
  })

  it('"Select all" ticks and unticks the list', async () => {
    serve()
    renderModal(CALENDLY_SYNC_DIRECTIONS.PULL)
    await screen.findByText('Intro call')

    await userEvent.click(box(/select all from calendly/i))
    expect(box(/intro call/i)).not.toBeChecked()
    expect(button(/pull selected/i)).toHaveTextContent('(0)')
    expect(button(/pull selected/i)).toBeDisabled()
  })

  it('says so when there is nothing to pull', async () => {
    serve({ pull: [], push: preview.push, event_types: [zoom] })
    renderModal(CALENDLY_SYNC_DIRECTIONS.PULL)

    expect(await screen.findByText(/nothing new in calendly/i)).toBeInTheDocument()
    expect(button(/pull selected/i)).toBeDisabled()
  })
})

describe('CalendlySyncModal - Push to Calendly', () => {
  it('lists only the appointments not in Calendly yet; a past one cannot go', async () => {
    serve()
    renderModal(CALENDLY_SYNC_DIRECTIONS.PUSH)

    expect(await screen.findByText('Business review')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Push to Calendly', hidden: true })).toBeInTheDocument()
    expect(box(/business review/i)).toBeChecked()
    expect(box(/kick-off/i)).not.toBeChecked()
    expect(box(/kick-off/i)).toBeDisabled()
    expect(screen.getByText(/calendly cannot book a past time/i)).toBeInTheDocument()
    // One event type: named, no dropdown.
    expect(screen.getByText('30 Minute Meeting')).toBeInTheDocument()
    expect(document.querySelector('.calendly-event-type-dropdown')).toBeNull()
    // Nothing about pulling.
    expect(screen.queryByText('Intro call')).not.toBeInTheDocument()
  })

  it('each meeting can use its own title and length - off by default, sent per meeting', async () => {
    const bodies = serve()
    renderModal(CALENDLY_SYNC_DIRECTIONS.PUSH)
    await screen.findByText('Business review')

    expect(useTitle('Business review')).not.toBeChecked()
    // A meeting that cannot go to Calendly has no such box.
    expect(within(row('Kick-off')).queryByRole('checkbox', { name: 'Use this title in Calendly', hidden: true })).toBeNull()

    await userEvent.click(useTitle('Business review'))
    await userEvent.click(button(/push selected \(1\)/i))

    await waitFor(() => expect(bodies).toHaveLength(1))
    expect(bodies[0]).toMatchObject({ ...DATES, pull: [], push: [7], push_use_title: [7], calendly_event_type_uri: 'ET1' })
    expect(await screen.findByText('That time is not open in Calendly.')).toBeInTheDocument()
  })

  it('a meeting unticked from the list cannot keep its title box ticked', async () => {
    serve()
    renderModal(CALENDLY_SYNC_DIRECTIONS.PUSH)
    await screen.findByText('Business review')

    await userEvent.click(useTitle('Business review'))
    await userEvent.click(box(/business review/i))

    expect(useTitle('Business review')).toBeDisabled()
    expect(button(/push selected/i)).toBeDisabled()
  })

  it('says so when every appointment is in Calendly', async () => {
    serve({ pull: preview.pull, push: [], event_types: [zoom] })
    renderModal(CALENDLY_SYNC_DIRECTIONS.PUSH)

    expect(await screen.findByText(/every appointment you made in these dates is in calendly/i)).toBeInTheDocument()
    expect(button(/push selected/i)).toBeDisabled()
  })
})


describe('CalendlySyncModal - closing', () => {
  it('keeps its list while it fades out, so it closes smoothly', async () => {
    serve()
    const props = { direction: CALENDLY_SYNC_DIRECTIONS.PULL, dates: DATES, onClose: vi.fn(), onSynced: vi.fn() }
    const { rerender } = renderWithProviders(<CalendlySyncModal show {...props} />)
    await screen.findByText('Intro call')

    rerender(<CalendlySyncModal show={false} {...props} />)

    expect(screen.getByText('Intro call')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Pull from Calendly', hidden: true })).toBeInTheDocument()
  })
})
