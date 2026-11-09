import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, screen } from '@testing-library/react'
import { renderWithProviders } from '../../../../test-utils'
import PersonalDetailsSection from '../../../../../src/pages/employees/components/form-sections/PersonalDetailsSection'

/**
 * Employee form Date of Birth: an empty field opens 18 years back, a saved one
 * on its date; an under-18 date shows the minimum-age message, and the API's
 * own message for the field is shown (it was hidden: .invalid-feedback with no
 * .is-invalid sibling).
 */
const MESSAGE = 'You must be at least 18 years old to continue.'

const trigger = (kind: 'month' | 'year') =>
  document.querySelector<HTMLButtonElement>(`.p-datepicker .fp-yd-trigger[data-kind="${kind}"]`)!

const openDateOfBirth = async () => {
  act(() => {
    fireEvent.focus(document.querySelector<HTMLInputElement>('.custom-datepicker input')!)
  })
  for (let i = 0; i < 3; i++) await act(() => new Promise(r => setTimeout(r, 100)))
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 10, 9, 10, 0))
})
afterEach(() => vi.useRealTimers())

describe('Employee Date of Birth calendar', () => {
  it('opens on November 2008 when no date of birth is saved', async () => {
    renderWithProviders(<PersonalDetailsSection employee={{}} onChange={vi.fn()} errors={{}} />)

    await openDateOfBirth()

    expect(trigger('month').textContent).toBe('November')
    expect(trigger('year').textContent).toBe('2008')
  })

  it('opens on the saved date of birth', async () => {
    renderWithProviders(<PersonalDetailsSection employee={{ date_of_birth: '1990-05-12' }} onChange={vi.fn()} errors={{}} />)

    await openDateOfBirth()

    expect(trigger('month').textContent).toBe('May')
    expect(trigger('year').textContent).toBe('1990')
  })

  it('shows the minimum-age message for an under-18 date', () => {
    renderWithProviders(<PersonalDetailsSection employee={{ date_of_birth: '2026-01-01' }} onChange={vi.fn()} errors={{}} />)

    expect(screen.getByText(MESSAGE)).toHaveClass('d-block')
    expect(document.querySelector('.custom-datepicker .p-calendar')).toHaveClass('is-invalid')
  })

  it('shows the API message for the field', () => {
    renderWithProviders(<PersonalDetailsSection employee={{}} onChange={vi.fn()} errors={{ date_of_birth: 'Enter a valid date of birth.' }} />)

    expect(screen.getByText('Enter a valid date of birth.')).toHaveClass('d-block')
  })
})
