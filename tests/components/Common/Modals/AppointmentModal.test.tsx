import { createRef, type ComponentType, type Ref } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { act, renderWithProviders, screen, waitFor, within } from '../../../test-utils'
import { allowBackgroundCalls, api, signIn } from '../../../pages/pageHarness'

vi.mock('react-toastify', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-toastify')>()
  return { ...actual, toast: Object.assign(vi.fn(), { info: vi.fn(), success: vi.fn(), error: vi.fn(), warn: vi.fn() }) }
})
vi.mock('bootstrap/js/dist/modal', () => import('../../../mocks/fakeBootstrapModal'))
vi.mock('../../../../src/hooks/useSummernote', () => ({ useSummernote: () => ({ editorRef: () => {} }) }))

import AppointmentModalJsx from '../../../../src/components/Common/Modals/AppointmentModal'

type ModalHandle = { show: (id: number) => Promise<void> }
// A .jsx forwardRef: TypeScript infers no props for it.
const AppointmentModal = AppointmentModalJsx as unknown as ComponentType<{ ref: Ref<ModalHandle>; onSuccess: () => void }>

const CLIENT_ID = 50
const PARTNER_ID = 7
const ALL = ['view appointments', 'update appointments', 'delete appointments']

// BUG-102: a white-label client books a meeting with its partner (Wanda).
const appointment = (extra: Record<string, unknown> = {}) => ({
  id: 1,
  subject: 'QA-TEST Run1 WL client booking',
  appointment_date: '2999-10-28 09:00:00',
  duration_minutes: 30,
  meeting_type: 'Business Review',
  status: 'pending',
  scheduled_by: { id: CLIENT_ID, name: 'QA-TEST Wanda Client One' },
  assigned_for: { id: PARTNER_ID, name: 'Wanda', entity_type: 'Partner', entity_id: 3 },
  ...extra,
})

const open = async (userId: number, apt = appointment(), permissions = ALL) => {
  signIn({ id: userId, is_host: 0, permissions })
  allowBackgroundCalls()
  api('get', '/common/appointments/1', { status: true, data: apt })
  const update = api('put', '/common/appointments/1', { status: true, message: 'Appointment updated' })
  const onSuccess = vi.fn()
  const ref = createRef<ModalHandle>()
  renderWithProviders(<AppointmentModal ref={ref} onSuccess={onSuccess} />)
  await act(() => ref.current!.show(1))
  await screen.findByText('QA-TEST Run1 WL client booking')
  return { update, onSuccess }
}

beforeEach(() => vi.clearAllMocks())

describe('AppointmentModal - who may change an appointment (BUG-102)', () => {
  it('the person who booked it keeps Edit and Delete, and gets no Confirm', async () => {
    await open(CLIENT_ID)

    expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^\W*confirm$/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /cancel appointment/i })).not.toBeInTheDocument()
  })

  it('the person it was booked with can reschedule, confirm or cancel it', async () => {
    await open(PARTNER_ID)

    expect(screen.getByRole('button', { name: /reschedule/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^\W*confirm$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cancel appointment/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument()
  })

  it('Confirm sets the status to confirmed, keeping who it is with', async () => {
    const user = userEvent.setup()
    const { update, onSuccess } = await open(PARTNER_ID)

    await user.click(screen.getByRole('button', { name: /^\W*confirm$/i }))

    await waitFor(() => expect(update.calls).toBe(1))
    expect(update.bodies[0]).toEqual({ assigned_for: PARTNER_ID, status: 'confirmed' })
    await waitFor(() => expect(onSuccess).toHaveBeenCalled())
  })

  it('Cancel appointment asks first, then sets the status to cancelled', async () => {
    const user = userEvent.setup()
    const { update, onSuccess } = await open(PARTNER_ID)

    await user.click(screen.getByRole('button', { name: /cancel appointment/i }))
    expect(update.calls).toBe(0)
    const dialog = (await screen.findByText('Cancel this appointment?')).closest('.modal') as HTMLElement
    await user.click(within(dialog).getByRole('button', { name: /yes, cancel it/i }))

    await waitFor(() => expect(update.calls).toBe(1))
    expect(update.bodies[0]).toEqual({ assigned_for: PARTNER_ID, status: 'cancelled' })
    await waitFor(() => expect(onSuccess).toHaveBeenCalled())
  })

  // Bootstrap reports a closed dialog with `hidden.bs.modal`; the fake modal does not.
  const hidden = (el: HTMLElement) => act(() => { el.dispatchEvent(new Event('hidden.bs.modal')) })
  const details = () => document.getElementById('appointmentModal')!

  it('closing the cancel question goes back to the appointment details', async () => {
    const user = userEvent.setup()
    const { update } = await open(PARTNER_ID)

    await user.click(screen.getByRole('button', { name: /cancel appointment/i }))
    expect(details()).not.toHaveClass('show')
    const dialog = (await screen.findByText('Cancel this appointment?')).closest('.modal') as HTMLElement
    await user.click(within(dialog).getByRole('button', { name: /^close$/i }))
    await hidden(dialog)

    expect(details()).toHaveClass('show')
    expect(update.calls).toBe(0)
  })

  it('once cancelled, the appointment details do not open again', async () => {
    const user = userEvent.setup()
    const { update } = await open(PARTNER_ID)

    await user.click(screen.getByRole('button', { name: /cancel appointment/i }))
    const dialog = (await screen.findByText('Cancel this appointment?')).closest('.modal') as HTMLElement
    await user.click(within(dialog).getByRole('button', { name: /yes, cancel it/i }))
    await waitFor(() => expect(update.calls).toBe(1))
    await hidden(dialog)

    expect(details()).not.toHaveClass('show')
  })

  it('an already confirmed appointment offers no Confirm, but can still be cancelled', async () => {
    await open(PARTNER_ID, appointment({ status: 'confirmed' }))

    expect(screen.queryByRole('button', { name: /^\W*confirm$/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cancel appointment/i })).toBeInTheDocument()
  })

  it('a cancelled appointment offers neither Confirm nor Cancel', async () => {
    await open(PARTNER_ID, appointment({ status: 'cancelled' }))

    expect(screen.queryByRole('button', { name: /^\W*confirm$/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /cancel appointment/i })).not.toBeInTheDocument()
  })

  it('without the update permission the invitee gets no actions', async () => {
    await open(PARTNER_ID, appointment(), ['view appointments'])

    expect(screen.queryByRole('button', { name: /reschedule/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^\W*confirm$/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /cancel appointment/i })).not.toBeInTheDocument()
  })

  it('Reschedule hides the "Appointment With" picker and saves the new time without changing who it is with', async () => {
    const user = userEvent.setup()
    const { update } = await open(PARTNER_ID)

    await user.click(screen.getByRole('button', { name: /reschedule/i }))

    expect(screen.queryByText('Select Users')).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/meeting with host/i)).not.toBeInTheDocument()
    await user.click(await screen.findByRole('button', { name: /save changes/i }))

    await waitFor(() => expect(update.calls).toBe(1))
    const body = update.bodies[0]
    expect(body).toMatchObject({ assigned_for: PARTNER_ID, appointment_date: '2999-10-28 09:00:00', duration_minutes: 30 })
    expect(body).not.toHaveProperty('entity_type')
    expect(body).not.toHaveProperty('entity_id')
    expect(body).not.toHaveProperty('meeting_with_host')
  })
})
