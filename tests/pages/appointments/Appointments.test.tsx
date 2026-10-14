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
