import { describe, expect, it, vi } from 'vitest'
import { useState } from 'react'
import userEvent from '@testing-library/user-event'
import { render, screen } from '@testing-library/react'
import AttendeePicker from '../../../src/components/Appointment/AttendeePicker'
import { MAX_ATTENDEES, type AttendeeConflict, type AttendeeInput } from '../../../src/modules/appointment/types'

const options = [
  { label: 'Sam Staff', user_id: 1 },
  { label: 'Pat Partner', user_id: 2 },
]

function Harness({ initial = [], conflicts, errors, onChange = vi.fn() }: {
  initial?: AttendeeInput[]
  conflicts?: AttendeeConflict[]
  errors?: Record<string, string | string[]>
  onChange?: (v: AttendeeInput[]) => void
}) {
  const [value, setValue] = useState<AttendeeInput[]>(initial)
  return (
    <AttendeePicker
      options={options}
      value={value}
      onChange={(v) => { setValue(v); onChange(v) }}
      conflicts={conflicts}
      errors={errors}
    />
  )
}

describe('AttendeePicker (Calendly v2: several people, users or outside emails)', () => {
  it('adds platform users and outside emails, and removes them', async () => {
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)

    await userEvent.type(screen.getByRole('combobox', { name: /add people/i }), 'sam')
    await userEvent.click(screen.getByRole('option', { name: /sam staff/i }))
    await userEvent.type(screen.getByRole('combobox', { name: /add people/i }), ' Guest@Example.com {Enter}')

    expect(screen.getByText('Sam Staff')).toBeInTheDocument()
    expect(screen.getByText('guest@example.com')).toBeInTheDocument()
    expect(onChange).toHaveBeenLastCalledWith([{ user_id: 1, name: 'Sam Staff' }, { email: 'guest@example.com' }])

    await userEvent.click(screen.getByRole('button', { name: /remove sam staff/i }))
    expect(onChange).toHaveBeenLastCalledWith([{ email: 'guest@example.com' }])
  })

  it('searches people by name and picks one with the keyboard', async () => {
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)

    await userEvent.type(screen.getByRole('combobox', { name: /add people/i }), 'pat')

    expect(screen.getByRole('option', { name: /pat partner/i })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: /sam staff/i })).not.toBeInTheDocument()
    await userEvent.keyboard('{Enter}')
    expect(onChange).toHaveBeenLastCalledWith([{ user_id: 2, name: 'Pat Partner' }])
  })

  it('offers to invite a typed email that matches nobody', async () => {
    render(<Harness />)

    await userEvent.type(screen.getByRole('combobox', { name: /add people/i }), 'new@person.com')

    expect(screen.getByRole('option', { name: /invite new@person.com/i })).toBeInTheDocument()
  })

  it('does not offer someone already picked, nor the same email twice', async () => {
    const onChange = vi.fn()
    render(<Harness initial={[{ user_id: 1 }, { email: 'guest@example.com' }]} onChange={onChange} />)

    await userEvent.click(screen.getByRole('combobox', { name: /add people/i }))
    expect(screen.queryByRole('option', { name: /sam staff/i })).not.toBeInTheDocument()
    await userEvent.type(screen.getByRole('combobox', { name: /add people/i }), 'GUEST@example.com{Enter}')

    expect(onChange).not.toHaveBeenCalled()
    expect(screen.getByText(/already on the appointment/i)).toBeInTheDocument()
  })

  it('stops offering more once the limit is reached', () => {
    const full = Array.from({ length: MAX_ATTENDEES }, (_, i) => ({ email: `p${i}@example.com` }))
    render(<Harness initial={full} />)

    expect(screen.queryByRole('combobox', { name: /add people/i })).not.toBeInTheDocument()
    expect(screen.getByText(new RegExp(`up to ${MAX_ATTENDEES} people`, 'i'))).toBeInTheDocument()
  })

  it("keeps a picked person's name when the list no longer has them", () => {
    render(<AttendeePicker options={[]} value={[{ user_id: 9, name: 'Former Option' }]} onChange={vi.fn()} />)

    expect(screen.getByText('Former Option')).toBeInTheDocument()
  })

  it('warns beside someone who already has an appointment then', () => {
    render(<Harness
      initial={[{ user_id: 2 }]}
      conflicts={[{ user_id: 2, name: 'Pat Partner', conflicts: [{ id: 9, date: '2026-11-27', start_time: '09:00', end_time: '09:30', duration_minutes: 30 }] }]}
    />)

    expect(screen.getByText(/already has an appointment 09:00.09:30/i)).toBeInTheDocument()
  })

  it('shows the API\'s reason under the person it is about', () => {
    render(<Harness initial={[{ email: 'bad' }]} errors={{ 'attendees.0.email': ['Enter a valid email address.'] }} />)

    expect(screen.getByText('Enter a valid email address.')).toBeInTheDocument()
  })

  it("shows a person's role under their name, outside emails as guests, and how many are on it", () => {
    render(<AttendeePicker
      options={[{ label: 'Michael Chen (Borrower)', user_id: 5 }]}
      value={[{ user_id: 5 }, { email: 'guest@example.com' }]}
      onChange={vi.fn()}
    />)

    expect(screen.getByText('Michael Chen')).toBeInTheDocument()
    expect(screen.getByText('Borrower')).toBeInTheDocument()
    expect(screen.getByText(/invited by email/i)).toBeInTheDocument()
    expect(screen.getByText(`2 of ${MAX_ATTENDEES}`)).toBeInTheDocument()
  })
})
