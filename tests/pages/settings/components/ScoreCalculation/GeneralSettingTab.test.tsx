import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import GeneralSettingTab from '../../../../../src/pages/settings/components/ScoreCalculation/GeneralSettingTab'

const range = (start: string, end: string) => ({ start, end })
const timeSettings = {
  morning: range('08:00', '11:59'),
  midday: range('12:00', '13:59'),
  afternoon: range('14:00', '16:59'),
  evening: range('17:00', '20:59'),
  anytime: range('00:00', '23:59'),
}

describe('GeneralSettingTab time fields', () => {
  it('use the app time picker (primary colour) instead of the browser picker', () => {
    render(<GeneralSettingTab timeSettings={timeSettings} onChange={() => {}} nextPlayDelay="" onNextPlayDelayChange={() => {}} />)

    const timeInputs = document.querySelectorAll('input[type="time"]')
    expect(timeInputs.length).toBeGreaterThan(0)
    timeInputs.forEach(input => expect(input.closest('.time-field')).not.toBeNull())
    expect(screen.getAllByRole('button', { name: /choose time/i })).toHaveLength(timeInputs.length)
  })

  it('a time picked from the picker is saved through onChange as before', () => {
    const onChange = vi.fn()
    render(<GeneralSettingTab timeSettings={timeSettings} onChange={onChange} nextPlayDelay="" onNextPlayDelayChange={() => {}} />)

    fireEvent.click(screen.getAllByRole('button', { name: /choose time/i })[0])
    const hour = Array.from(document.querySelectorAll<HTMLElement>('.time-field__column[data-kind="hour"] .fp-yd-opt')).find(o => o.textContent === '09')!
    fireEvent.click(hour)

    expect(onChange).toHaveBeenLastCalledWith({ ...timeSettings, morning: range('09:00', '11:59') })
  })
})
