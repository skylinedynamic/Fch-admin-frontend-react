import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { Calendar } from 'primereact/calendar'
import { localeOption } from 'primereact/api'
import { applyCalendarLocale, CALENDAR_WEEKDAY_LABELS } from '../../src/config/calendarLocale'

describe('applyCalendarLocale', () => {
  it('gives PrimeReact the same three-letter weekday labels Flatpickr shows', () => {
    applyCalendarLocale()

    expect(localeOption('dayNamesMin', 'en')).toEqual(CALENDAR_WEEKDAY_LABELS)
    expect(CALENDAR_WEEKDAY_LABELS).toEqual(['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'])
  })

  it('a rendered PrimeReact calendar heads its columns with them', () => {
    applyCalendarLocale()
    const { container } = render(<Calendar inline value={new Date(2026, 9, 9)} />)

    const heads = Array.from(container.querySelectorAll('thead th span')).map(s => s.textContent)
    expect(heads).toEqual(['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'])
  })
})
