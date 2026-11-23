import { beforeEach, describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { screen, waitFor } from '../../test-utils'
import { allowBackgroundCalls, api, renderPage, signIn } from '../pageHarness'

vi.mock('react-toastify', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-toastify')>()
  return { ...actual, toast: Object.assign(vi.fn(), { info: vi.fn(), success: vi.fn(), error: vi.fn(), warn: vi.fn() }) }
})
vi.mock('bootstrap/js/dist/modal', () => import('../../mocks/fakeBootstrapModal'))
vi.mock('../../../src/hooks/useSummernote', () => ({ useSummernote: () => ({ editorRef: () => {} }) }))

import { toast } from 'react-toastify'
import Appointments from '../../../src/pages/appointments/Appointments'

const LIST = '/common/appointments/fetch-all'

// An appointment far enough in the future to always count as upcoming.
const APPOINTMENT = {
  id: 1, subject: 'Intro call with Acme', appointment_date: '2999-06-15 10:00:00', duration_minutes: 30, status: 'scheduled',
}

const mount = (permissions: string[], response: unknown = { status: true, data: [APPOINTMENT] }, status = 200) => {
  signIn({ permissions })
  allowBackgroundCalls()
  const list = api('post', LIST, response, status)
  const view = renderPage(<Appointments />, { path: '/appointments' })
  return { list, ...view }
}

beforeEach(() => vi.clearAllMocks())

describe('Appointments', () => {
  it('requests the appointments and renders the calendar', async () => {
    const { list, container } = mount(['view appointments'])

    await waitFor(() => expect(list.calls).toBe(1))
    await waitFor(() => expect(container.querySelector('.fc')).not.toBeNull())
  })

  it('lists an upcoming appointment', async () => {
    mount(['view appointments'])

    expect((await screen.findAllByText('Intro call with Acme')).length).toBeGreaterThan(0)
  })

  it('hides the create button without the create permission', async () => {
    const { container, list } = mount(['view appointments'])

    await waitFor(() => expect(list.calls).toBe(1))
    expect(container.querySelector('#btn-new-event')).toBeNull()
    expect(screen.queryByRole('button', { name: /create new appointment/i })).not.toBeInTheDocument()
  })

  it('shows the create button with the create permission', async () => {
    const { container, list } = mount(['view appointments', 'create appointments'])

    await waitFor(() => expect(list.calls).toBe(1))
    expect(container.querySelector('#btn-new-event')).not.toBeNull()
  })

  it('reports a failed load', async () => {
    mount(['view appointments'], { message: 'boom' }, 500)

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Failed to load appointments'))
  })

  it('copes with an empty appointment list', async () => {
    const { container, list } = mount(['view appointments'], { status: true, data: [] })

    await waitFor(() => expect(list.calls).toBe(1))
    await waitFor(() => expect(container.querySelector('.fc')).not.toBeNull())
    expect(toast.error).not.toHaveBeenCalled()
  })

  // Same panel as the borrower portal (client-fch): heading and empty-state card.
  it('shows the borrower-portal style heading and empty state', async () => {
    mount(['view appointments', 'create appointments'], { status: true, data: [] })

    expect(await screen.findByText('No Upcoming Events')).toBeInTheDocument()
    expect(screen.getByText('There is no schedule found')).toBeInTheDocument()
    expect(screen.getByText('Use the button above to book your next session.')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Upcoming Appointment' })).toBeInTheDocument()
    expect(screen.getByText("Don't miss scheduled appointments")).toBeInTheDocument()
    expect(screen.queryByText('No upcoming appointments')).not.toBeInTheDocument()
    // The theme's .border-dashed removes the border here; this class draws the borrower portal's dashed box.
    expect(screen.getByText('No Upcoming Events').closest('.appointment-empty-card')).not.toBeNull()
  })

  it('does not point to the create button when the user cannot create', async () => {
    mount(['view appointments'], { status: true, data: [] })

    expect(await screen.findByText('No Upcoming Events')).toBeInTheDocument()
    expect(screen.queryByText('Use the button above to book your next session.')).not.toBeInTheDocument()
  })

  it('opening the create button does not throw', async () => {
    const user = userEvent.setup()
    const { container, list } = mount(['view appointments', 'create appointments'])
    await waitFor(() => expect(list.calls).toBe(1))

    await user.click(container.querySelector('#btn-new-event')!)

    expect(toast.warn).not.toHaveBeenCalled()
  })

  it('marks an appointment that was booked over another one', async () => {
    // One far ahead for the upcoming list, one today so the calendar's current month shows it.
    const today = new Date()
    const todayAt = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')} 12:00:00`
    const { container } = mount(['view appointments'], { status: true, data: [
      { ...APPOINTMENT, is_calendly: true, had_conflict: true },
      { ...APPOINTMENT, id: 2, subject: 'Overlapping today', appointment_date: todayAt, had_conflict: true },
    ] })

    expect((await screen.findAllByText('Booked over another appointment')).length).toBeGreaterThan(0)
    await waitFor(() => expect(container.querySelector('.fc-event.apt-conflict, .apt-conflict')).not.toBeNull())
  })

  it('does not mark an appointment that was not', async () => {
    mount(['view appointments'], { status: true, data: [{ ...APPOINTMENT, had_conflict: false }] })

    await screen.findAllByText('Intro call with Acme')
    expect(screen.queryByText('Booked over another appointment')).not.toBeInTheDocument()
  })

  it('leaves meetings that have already ended out of the list', async () => {
    mount(['view appointments'], { status: true, data: [
      APPOINTMENT,
      { ...APPOINTMENT, id: 3, subject: 'Long gone meeting', appointment_date: '2020-03-11 15:00:00', status: 'pending' },
    ] })

    expect((await screen.findAllByText('Intro call with Acme')).length).toBeGreaterThan(0)
    expect(screen.queryByText('Long gone meeting')).not.toBeInTheDocument()
    expect(screen.queryByText('Expired')).not.toBeInTheDocument()
  })

  it('says so when nothing is coming up', async () => {
    mount(['view appointments'], { status: true, data: [{ ...APPOINTMENT, appointment_date: '2020-03-11 15:00:00' }] })

    expect(await screen.findByText('No Upcoming Events')).toBeInTheDocument()
  })
})

// BUG-004 (QA round 2): an upcoming appointment's description is stored HTML;
// it must not run script.
describe('Appointments - descriptions cannot run script (BUG-004)', () => {
  it('lists the description without the onerror handler', async () => {
    const { container } = mount(['view appointments'], {
      status: true,
      data: [{ ...APPOINTMENT, description: 'Agenda <b>review</b> <img src=x onerror="window.__xss = 1">' }],
    })

    expect((await screen.findAllByText('review')).length).toBeGreaterThan(0)
    expect(container.querySelector('[onerror]')).toBeNull()
  })
})
