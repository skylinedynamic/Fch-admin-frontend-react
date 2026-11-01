import { describe, expect, it, vi } from 'vitest'
import { useState } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import ActivitySelect, { type ActivitySelectOption } from '../../../../../src/components/Common/Modals/activity-create/ActivitySelect'

const OPTIONS: ActivitySelectOption[] = [
  { value: '12', label: 'Avery Staff', avatar: 'AS', description: 'avery@example.test' },
  { value: '14', label: 'Blake Ops', avatar: 'BO' },
  { value: '15', label: 'Casey Lane', avatar: 'CL' },
]

function Controlled(props: Partial<React.ComponentProps<typeof ActivitySelect>> & { onPick?: (v: string) => void }) {
  const [value, setValue] = useState('')
  return (
    <ActivitySelect
      id="staff"
      value={value}
      options={OPTIONS}
      placeholder="Select staff member"
      onChange={(v) => {
        setValue(v)
        props.onPick?.(v)
      }}
      {...props}
    />
  )
}

const trigger = () => screen.getByRole('combobox')

describe('ActivitySelect', () => {
  it('shows the placeholder until something is picked', () => {
    render(<Controlled />)

    expect(trigger()).toHaveTextContent('Select staff member')
    expect(trigger()).toHaveAttribute('aria-expanded', 'false')
  })

  it('opens a listbox of the options and picks one on click', () => {
    const onPick = vi.fn()
    render(<Controlled onPick={onPick} />)

    fireEvent.click(trigger())
    expect(trigger()).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getAllByRole('option')).toHaveLength(3)

    fireEvent.click(screen.getByRole('option', { name: /Blake Ops/ }))

    expect(onPick).toHaveBeenCalledWith('14')
    expect(trigger()).toHaveTextContent('Blake Ops')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('marks the chosen option as selected', () => {
    render(<ActivitySelect id="staff" value="15" options={OPTIONS} onChange={() => { }} />)

    fireEvent.click(trigger())

    expect(screen.getByRole('option', { name: /Casey Lane/ })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('option', { name: /Avery Staff/ })).toHaveAttribute('aria-selected', 'false')
  })

  it('filters by name or description in a searchable list, with an empty state', () => {
    render(<Controlled searchable searchPlaceholder="Search staff..." emptyText="No staff members found" />)

    fireEvent.click(trigger())
    const search = screen.getByLabelText('Search staff...')

    fireEvent.change(search, { target: { value: 'avery@' } })
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual([expect.stringContaining('Avery Staff')])

    fireEvent.change(search, { target: { value: 'zzz' } })
    expect(screen.queryAllByRole('option')).toHaveLength(0)
    expect(screen.getByText('No staff members found')).toBeInTheDocument()
  })

  it('moves with the arrow keys and picks with Enter', () => {
    const onPick = vi.fn()
    render(<Controlled onPick={onPick} />)

    fireEvent.keyDown(trigger(), { key: 'ArrowDown' })
    expect(trigger()).toHaveAttribute('aria-expanded', 'true')
    fireEvent.keyDown(trigger(), { key: 'ArrowDown' })
    fireEvent.keyDown(trigger(), { key: 'Enter' })

    expect(onPick).toHaveBeenCalledTimes(1)
    expect(trigger()).toHaveTextContent(/Avery Staff|Blake Ops/)
  })

  it('closes on Escape without picking anything', () => {
    const onPick = vi.fn()
    render(<Controlled onPick={onPick} />)

    fireEvent.click(trigger())
    fireEvent.keyDown(trigger(), { key: 'Escape' })

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(onPick).not.toHaveBeenCalled()
  })

  it('keeps the Escape from reaching the modal underneath', () => {
    const modalEscape = vi.fn()
    document.addEventListener('keydown', modalEscape)
    render(<Controlled />)

    fireEvent.click(trigger())
    fireEvent.keyDown(trigger(), { key: 'Escape' })

    expect(modalEscape).not.toHaveBeenCalled()
    document.removeEventListener('keydown', modalEscape)
  })

  it('shows a loading state and cannot be opened while loading or disabled', () => {
    const { rerender } = render(<ActivitySelect id="staff" value="" options={OPTIONS} onChange={() => { }} loading disabled />)

    expect(trigger()).toHaveTextContent('Loading...')
    expect(trigger()).toBeDisabled()

    rerender(<ActivitySelect id="staff" value="" options={OPTIONS} onChange={() => { }} invalid />)
    expect(trigger()).toHaveClass('is-invalid')
    expect(trigger()).toHaveAttribute('aria-invalid', 'true')
  })

  it('shows initials avatars for people', () => {
    render(<ActivitySelect id="staff" value="12" options={OPTIONS} onChange={() => { }} />)

    expect(trigger()).toHaveTextContent('AS')
  })
})
