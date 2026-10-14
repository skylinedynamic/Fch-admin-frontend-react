import { afterEach, describe, expect, it, vi } from 'vitest'
import { useState } from 'react'
import { act, render, screen, fireEvent } from '@testing-library/react'
// Resolves to src/components/Calendar/CalendarWrapper.tsx through the Vite
// alias, exactly as every page's import does.
import { Calendar } from 'primereact/calendar'
import { yearRangeFor } from '../../../src/components/Calendar/CalendarWrapper'

const Harness = (props: Record<string, unknown>) => {
  const [value, setValue] = useState<Date | null>(new Date(2026, 9, 9))
  return <Calendar inline value={value} onChange={e => setValue(e.value as Date)} {...props} />
}

const trigger = (kind: 'month' | 'year') =>
  document.querySelector<HTMLButtonElement>(`.fp-yd-trigger[data-kind="${kind}"]`)!
const list = (kind: 'month' | 'year') =>
  document.querySelector<HTMLElement>(`.fp-yd-list[data-kind="${kind}"]`)!
const labels = (kind: 'month' | 'year') =>
  Array.from(list(kind).querySelectorAll('.fp-yd-opt')).map(o => o.textContent)
const title = () => document.querySelector('.p-datepicker-title')!.textContent

describe('Calendar (PrimeReact, via the alias)', () => {
  it('shows the borrower-style month and year dropdowns instead of the grid-view buttons', () => {
    render(<Harness />)

    expect(trigger('month').textContent).toBe('October')
    expect(trigger('year').textContent).toBe('2026')
    // Same classes as the Flatpickr dropdowns, so the same look.
    expect(trigger('month').className).toBe('fp-yd-trigger')
    expect(document.querySelector('button.p-datepicker-month')).toBeNull()
  })

  it('opens a list on click, with the current value marked active', () => {
    render(<Harness />)

    fireEvent.click(trigger('month'))

    expect(list('month').classList.contains('fp-yd-open')).toBe(true)
    expect(list('month').querySelector('.fp-yd-active')!.textContent).toBe('October')
    expect(labels('month')).toHaveLength(12)
  })

  it('picking a month or a year moves the calendar there and closes the list', () => {
    render(<Harness />)

    fireEvent.click(trigger('month'))
    fireEvent.click(screen.getByRole('option', { name: 'March' }))
    expect(trigger('month').textContent).toBe('March')
    expect(list('month').classList.contains('fp-yd-open')).toBe(false)

    fireEvent.click(trigger('year'))
    fireEvent.click(screen.getByRole('option', { name: '1999' }))
    expect(trigger('year').textContent).toBe('1999')
    expect(title()).toContain('March')
  })

  it('opening one list closes the other, and a click outside closes both', () => {
    render(<Harness />)

    fireEvent.click(trigger('month'))
    fireEvent.click(trigger('year'))
    expect(list('month').classList.contains('fp-yd-open')).toBe(false)
    expect(list('year').classList.contains('fp-yd-open')).toBe(true)

    fireEvent.mouseDown(document.body)
    expect(list('year').classList.contains('fp-yd-open')).toBe(false)
  })

  it.each(['month', 'year'] as const)('a mouse wheel over the %s list scrolls the list, not the page', (kind) => {
    render(<Harness />)
    fireEvent.click(trigger(kind))

    const event = new WheelEvent('wheel', { deltaY: 120, bubbles: true, cancelable: true })
    list(kind).dispatchEvent(event)

    expect(event.defaultPrevented).toBe(true)
  })

  it('offers only the months and years minDate/maxDate allow', () => {
    render(<Harness minDate={new Date(2024, 3, 1)} maxDate={new Date(2026, 9, 31)} />)

    fireEvent.click(trigger('year'))
    expect(labels('year')).toEqual(['2024', '2025', '2026'])

    fireEvent.click(trigger('month'))
    // October 2026 is in maxDate's year: nothing after October.
    expect(labels('month')[labels('month').length - 1]).toBe('October')
  })

  it('marks days of the neighbouring months that are inside minDate/maxDate, as Flatpickr colours them', () => {
    // October 2026 starts on a Thursday: Sep 27-30 lead the first row.
    render(<Harness maxDate={new Date(2026, 9, 31)} />)

    const lead = Array.from(document.querySelectorAll('tbody tr:first-child td.p-datepicker-other-month > span'))
    expect(lead.map(s => s.textContent)).toEqual(['27', '28', '29', '30'])
    lead.forEach(s => expect(s.querySelector('.p-cal-other-in-range')).not.toBeNull())
  })

  it('does not mark neighbouring-month days outside minDate/maxDate', () => {
    render(<Harness minDate={new Date(2026, 9, 1)} />)

    const lead = Array.from(document.querySelectorAll('tbody tr:first-child td.p-datepicker-other-month > span'))
    expect(lead).toHaveLength(4)
    lead.forEach(s => expect(s.querySelector('.p-cal-other-in-range')).toBeNull())
    // Days of the month itself are rendered as before.
    expect(document.querySelector('td:not(.p-datepicker-other-month) > span .p-cal-other-in-range')).toBeNull()
  })

  it('leaves month-only and year-only pickers (view="month"/"year") as they were', () => {
    render(<Harness view="month" dateFormat="mm/yy" />)

    expect(document.querySelector('.fp-yd-trigger')).toBeNull()
  })

  it('a caller can still turn the navigators off', () => {
    render(<Harness monthNavigator={false} yearNavigator={false} />)

    expect(document.querySelector('.fp-yd-trigger')).toBeNull()
  })
})

describe('yearRangeFor', () => {
  const now = new Date(2026, 9, 9)

  it('runs from 1900 to ten years ahead by default', () => {
    expect(yearRangeFor(undefined, undefined, now)).toBe('1900:2036')
  })

  it('narrows to minDate and maxDate', () => {
    expect(yearRangeFor(new Date(2020, 0, 1), new Date(2030, 0, 1), now)).toBe('2020:2030')
  })
})

describe('Calendar popup on phones', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  const openPopup = async (props: Record<string, unknown> = {}) => {
    const Popup = () => {
      const [value, setValue] = useState<Date | null>(new Date(2026, 9, 9))
      return <Calendar inputId="cal" value={value} onChange={e => setValue(e.value as Date)} appendTo="self" {...props} />
    }
    render(<Popup />)
    act(() => {
      fireEvent.focus(document.getElementById('cal')!)
    })
    // Let the opening animation run to its end, as it does in a browser.
    for (let i = 0; i < 3; i++) await act(() => new Promise(r => setTimeout(r, 100)))
    return document.querySelector<HTMLElement>('.p-datepicker')!
  }

  it('turning the phone or scrolling the page while a popup is open does not throw', async () => {
    const errors: unknown[] = []
    const onError = (e: ErrorEvent) => { errors.push(e.error); e.preventDefault() }
    window.addEventListener('error', onError)
    try {
      const panel = await openPopup()
      expect(panel).not.toBeNull()

      act(() => {
        // A phone turned sideways, then the page scrolled under the popup.
        window.dispatchEvent(new Event('orientationchange'))
        document.body.dispatchEvent(new Event('scroll'))
      })
    } finally {
      window.removeEventListener('error', onError)
    }

    expect(errors).toEqual([])
  })

  it('a popup that would run off the right of the screen is moved back onto it', async () => {
    // A 320px phone, with the field in the right-hand half of the page. The
    // popup is 304px wide. A phone widens window.innerWidth - what PrimeReact
    // checks against - to fit whatever overflows the page; the page's own
    // width (documentElement.clientWidth) stays 320.
    const isPanel = (el: Element) => el.classList.contains('p-datepicker')
    const panelLeft = (el: HTMLElement) => 167 + (parseFloat(el.style.left) || 0)
    const box = (left: number, width: number, height: number) =>
      ({ left, right: left + width, width, top: 0, bottom: height, height, x: left, y: 0, toJSON() {} }) as DOMRect
    vi.spyOn(document.documentElement, 'clientWidth', 'get').mockReturnValue(320)
    vi.spyOn(window, 'innerWidth', 'get').mockImplementation(() => {
      const panel = document.querySelector<HTMLElement>('.p-datepicker')
      return Math.max(320, panel ? panelLeft(panel) + 304 : 0)
    })
    vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockImplementation(function (this: HTMLElement) {
      return isPanel(this) ? 304 : 150
    })
    vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(function (this: HTMLElement) {
      return isPanel(this) ? 350 : 38
    })
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      return isPanel(this) ? box(panelLeft(this), 304, 350) : box(167, 150, 38)
    })

    const panel = await openPopup()

    // Its right edge now sits on the screen's: 167 + 304 - 320 = 151px back.
    expect(panel.style.left).toBe('-151px')
  })

  it('a popup that already fits is left where PrimeReact put it', async () => {
    vi.spyOn(document.documentElement, 'clientWidth', 'get').mockReturnValue(1280)

    const panel = await openPopup()

    expect(panel.style.left).toBe('0px')
  })
})
