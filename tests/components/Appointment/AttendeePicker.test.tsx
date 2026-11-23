import { describe, expect, it, vi } from 'vitest'
import { useState } from 'react'
import userEvent from '@testing-library/user-event'
import { act, render, screen } from '@testing-library/react'
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

  it('keeps the list open when focus is moved away by code, and closes it on a click outside', async () => {
    render(<><Harness /><button type="button">outside</button></>)
    const box = screen.getByRole('combobox', { name: /add people/i })

    await userEvent.type(box, 'sam')
    // A modal opening moves focus to itself; the list must survive that.
    act(() => { box.blur() })
    expect(screen.getByRole('option', { name: /sam staff/i })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'outside' }))
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it("is a search box the browser does not fill with its saved addresses", () => {
    render(<Harness />)
    const box = screen.getByRole('combobox', { name: /add people/i })

    // Chrome ignores autocomplete=off on a field it takes for an email; it leaves search fields alone.
    expect(box).toHaveAttribute('type', 'search')
    expect(box).toHaveAttribute('autocomplete', 'off')
    expect(box).toHaveAttribute('name', 'attendee-search')
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

  it('checks a typed email on Enter, and does not add one that is not an email address', async () => {
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)
    const box = screen.getByRole('combobox', { name: /add people/i })

    for (const bad of ['nope', 'guest@', 'guest@example', 'gu est@example.com']) {
      await userEvent.clear(box)
      await userEvent.type(box, `${bad}{Enter}`)
      expect(screen.getByText('Enter a valid email address.')).toBeInTheDocument()
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument() // the message is not hidden behind the list
    }
    expect(onChange).not.toHaveBeenCalled()

    await userEvent.clear(box)
    await userEvent.type(box, 'guest@example.com{Enter}')
    expect(onChange).toHaveBeenLastCalledWith([{ email: 'guest@example.com' }])
    expect(screen.queryByText('Enter a valid email address.')).not.toBeInTheDocument()
  })

  it('closes the list once someone is picked; typing opens it again', async () => {
    render(<Harness />)
    const box = screen.getByRole('combobox', { name: /add people/i })

    await userEvent.click(box)
    await userEvent.click(screen.getByRole('option', { name: /sam staff/i }))
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()

    await userEvent.type(box, 'pat')
    expect(screen.getByRole('option', { name: /pat partner/i })).toBeInTheDocument()
    await userEvent.keyboard('{Enter}')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })
})
