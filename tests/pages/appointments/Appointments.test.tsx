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

  it('opening the create button does not throw', async () => {
    const user = userEvent.setup()
    const { container, list } = mount(['view appointments', 'create appointments'])
    await waitFor(() => expect(list.calls).toBe(1))

    await user.click(container.querySelector('#btn-new-event')!)

    expect(toast.warn).not.toHaveBeenCalled()
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

// Calendly: meetings on the company Calendly account show here, marked, with
// their join and reschedule links; coming back from connecting Calendly says
// how it went.
describe('Appointments - Calendly', () => {
  const CALENDLY = {
    ...APPOINTMENT,
    id: 2,
    subject: '30 Minute Meeting with Jane',
    is_calendly: true,
    source: 'calendly',
    join_url: 'https://meet.google.com/abc',
    reschedule_url: 'https://calendly.com/reschedulings/INV1',
  }

  it('marks a Calendly meeting and links to join and reschedule it', async () => {
    mount(['view appointments'], { status: true, data: [CALENDLY] })

    expect((await screen.findAllByText('30 Minute Meeting with Jane')).length).toBeGreaterThan(0)
    expect(screen.getByText('Calendly', { selector: '.calendly-badge' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /join/i })).toHaveAttribute('href', 'https://meet.google.com/abc')
    expect(screen.getByRole('link', { name: /reschedule/i })).toHaveAttribute('href', 'https://calendly.com/reschedulings/INV1')
  })

  it('does not mark an FCH meeting as Calendly', async () => {
    mount(['view appointments'])

    expect((await screen.findAllByText('Intro call with Acme')).length).toBeGreaterThan(0)
    expect(screen.queryByText('Calendly', { selector: '.calendly-badge' })).not.toBeInTheDocument()
  })

  it('confirms Calendly was connected when coming back from Calendly', async () => {
    signIn({ permissions: ['view appointments'] })
    allowBackgroundCalls()
    api('post', LIST, { status: true, data: [] })
    renderPage(<Appointments />, { path: '/appointments', route: '/appointments?calendly=connected' })

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Calendly connected'))
  })

  it('reports a failed Calendly connection when coming back from Calendly', async () => {
    signIn({ permissions: ['view appointments'] })
    allowBackgroundCalls()
    api('post', LIST, { status: true, data: [] })
    renderPage(<Appointments />, { path: '/appointments', route: '/appointments?calendly=error' })

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Calendly could not be connected'))
  })
})
