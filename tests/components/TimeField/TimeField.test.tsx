import { describe, expect, it, vi } from 'vitest'
import { useState } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import TimeField from '../../../src/components/TimeField/TimeField'

const Harness = ({ initial = '22:59', onChange = vi.fn() }: { initial?: string; onChange?: (v: string) => void }) => {
  const [value, setValue] = useState(initial)
  return (
    <TimeField
      value={value}
      onChange={v => { setValue(v); onChange(v) }}
      className="form-control form-control-sm"
    />
  )
}

const input = () => document.querySelector<HTMLInputElement>('input[type="time"]')!
const openPicker = () => fireEvent.click(screen.getByRole('button', { name: /choose time/i }))
const column = (kind: 'hour' | 'minute' | 'period') =>
  document.querySelector<HTMLElement>(`.time-field__column[data-kind="${kind}"]`)!
const labels = (kind: 'hour' | 'minute' | 'period') =>
  Array.from(column(kind).querySelectorAll('.fp-yd-opt')).map(o => o.textContent)
const active = (kind: 'hour' | 'minute' | 'period') =>
  column(kind).querySelector('.fp-yd-active')?.textContent
const pick = (kind: 'hour' | 'minute' | 'period', label: string) =>
  fireEvent.click(Array.from(column(kind).querySelectorAll<HTMLElement>('.fp-yd-opt')).find(o => o.textContent === label)!)

describe('TimeField', () => {
  it('keeps the native time input, so a time can still be typed', () => {
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)

    expect(input().value).toBe('22:59')
    fireEvent.change(input(), { target: { value: '07:15' } })

    expect(onChange).toHaveBeenLastCalledWith('07:15')
  })

  it('opens a picker with hour, minute and AM/PM columns, the current time marked', () => {
    render(<Harness initial="22:59" />)
    expect(document.querySelector('.time-field__panel')).toBeNull()

    openPicker()

    expect(labels('hour')).toEqual(['12', '01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11'])
    expect(labels('minute')).toHaveLength(60)
    expect(labels('period')).toEqual(['AM', 'PM'])
    expect([active('hour'), active('minute'), active('period')]).toEqual(['10', '59', 'PM'])
    // The same option classes as the calendar dropdowns, so the same colours.
    expect(column('hour').querySelector('.fp-yd-active')!.className).toContain('fp-yd-opt')
  })

  it('picking a value updates the time in 24-hour form, as the native input reports it', () => {
    const onChange = vi.fn()
    render(<Harness initial="22:59" onChange={onChange} />)
    openPicker()

    pick('hour', '03')
    expect(onChange).toHaveBeenLastCalledWith('15:59')
    pick('minute', '05')
    expect(onChange).toHaveBeenLastCalledWith('15:05')
    pick('period', 'AM')
    expect(onChange).toHaveBeenLastCalledWith('03:05')
    pick('hour', '12')
    expect(onChange).toHaveBeenLastCalledWith('00:05')
    pick('period', 'PM')
    expect(onChange).toHaveBeenLastCalledWith('12:05')
  })

  it('starting from an empty value, a pick fills the rest with 00 and AM', () => {
    const onChange = vi.fn()
    render(<Harness initial="" onChange={onChange} />)
    openPicker()

    pick('hour', '09')

    expect(onChange).toHaveBeenLastCalledWith('09:00')
  })

  it('closes on Escape and on a click outside', () => {
    render(<Harness />)

    openPicker()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(document.querySelector('.time-field__panel')).toBeNull()

    openPicker()
    fireEvent.mouseDown(document.body)
    expect(document.querySelector('.time-field__panel')).toBeNull()
  })

  it('a mouse wheel over a column scrolls the column, not the page', () => {
    render(<Harness />)
    openPicker()

    const event = new WheelEvent('wheel', { deltaY: 120, bubbles: true, cancelable: true })
    column('minute').dispatchEvent(event)

    expect(event.defaultPrevented).toBe(true)
  })
})
