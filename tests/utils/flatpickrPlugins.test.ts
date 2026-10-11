import { afterEach, describe, expect, it, vi } from 'vitest'
import flatpickr from 'flatpickr'
import type { Instance } from 'flatpickr/dist/types/instance'
import { yearDropdownPlugin } from '../../src/utils/flatpickrPlugins'

// The plugin builds its markup on a timeout after flatpickr is ready.
const flush = () => new Promise(resolve => setTimeout(resolve, 0))

let fp: Instance | null = null

const mountWith = async (options: Record<string, unknown>, minYear?: number, maxYear?: number) => {
  const input = document.createElement('input')
  document.body.appendChild(input)
  fp = flatpickr(input, { ...options, plugins: [yearDropdownPlugin(minYear, maxYear)] }) as Instance
  fp.open()
  await flush()
  return fp.calendarContainer
}

const mount = (minYear: number, maxYear?: number) =>
  mountWith({ defaultDate: '2000-06-15', monthSelectorType: 'dropdown' }, minYear, maxYear)

const trigger = (cal: HTMLElement, kind: 'year' | 'month') =>
  cal.querySelector<HTMLButtonElement>(`.fp-yd-trigger[data-kind="${kind}"]`)!

const list = (cal: HTMLElement, kind: 'year' | 'month') =>
  cal.querySelector<HTMLElement>(`.fp-yd-list[data-kind="${kind}"]`)!

const options = (cal: HTMLElement, kind: 'year' | 'month') =>
  Array.from(list(cal, kind).querySelectorAll<HTMLElement>('.fp-yd-opt'))

const years = (cal: HTMLElement) => options(cal, 'year').map(o => o.dataset.value)

afterEach(() => {
  fp?.destroy()
  fp = null
  document.body.innerHTML = ''
})

describe('yearDropdownPlugin - year', () => {
  it('replaces the typeable year input with a dropdown trigger showing the current year', async () => {
    const cal = await mount(1900, 2026)

    expect(trigger(cal, 'year').textContent).toBe('2000')
    expect(cal.querySelector('.numInputWrapper')!.classList.contains('fp-has-custom-year')).toBe(true)
  })

  it('lists every year from the minimum to the maximum', async () => {
    const cal = await mount(1990, 2026)

    expect(years(cal)[0]).toBe('1990')
    expect(years(cal)[years(cal).length - 1]).toBe('2026')
    expect(years(cal)).toHaveLength(37)
  })

  it('defaults the maximum to the current year', async () => {
    const cal = await mount(2020)

    expect(years(cal)[years(cal).length - 1]).toBe(String(new Date().getFullYear()))
  })

  it('narrows the range to the picker minDate and maxDate', async () => {
    const cal = await mountWith({ defaultDate: '2010-01-01', minDate: '2005-03-01', maxDate: '2012-12-31' }, 1900, 2030)

    expect(years(cal)).toEqual(['2005', '2006', '2007', '2008', '2009', '2010', '2011', '2012'])
  })

  it('opens on trigger click and changes the calendar year when an option is picked', async () => {
    const cal = await mount(1900, 2026)

    trigger(cal, 'year').click()
    // A class, not an inline style: the stylesheet hides the list with
    // display:none !important, which an inline display:block cannot beat.
    expect(list(cal, 'year').classList.contains('fp-yd-open')).toBe(true)

    list(cal, 'year').querySelector<HTMLElement>('[data-value="1985"]')!.click()

    expect(fp!.currentYear).toBe(1985)
    expect(trigger(cal, 'year').textContent).toBe('1985')
    expect(list(cal, 'year').classList.contains('fp-yd-open')).toBe(false)
  })

  it('does nothing when the picker is destroyed before the deferred build runs', async () => {
    // e.g. a React component unmounting in the same tick it mounted
    vi.useFakeTimers()
    try {
      const input = document.createElement('input')
      document.body.appendChild(input)
      const instance = flatpickr(input, { plugins: [yearDropdownPlugin(1900)] }) as Instance
      instance.destroy()

      expect(() => vi.runAllTimers()).not.toThrow()
    } finally {
      vi.useRealTimers()
    }
  })

  it('does not build a second trigger when the calendar is reopened', async () => {
    const cal = await mount(1900, 2026)
    fp!.close()
    fp!.open()
    await flush()

    expect(cal.querySelectorAll('.fp-yd-trigger[data-kind="year"]')).toHaveLength(1)
    expect(cal.querySelectorAll('.fp-yd-trigger[data-kind="month"]')).toHaveLength(1)
  })
})

describe('yearDropdownPlugin - under react-flatpickr', () => {
  // react-flatpickr re-applies its own hooks on every re-render with
  // fp.set(hook, [...]), which replaces the plugin's hooks instead of adding to
  // them. The plugin has to keep working after that.
  const replaceHooks = () => {
    fp!.set('onClose', [() => {}])
    fp!.set('onChange', [() => {}])
    fp!.set('onMonthChange', [() => {}])
    fp!.set('onYearChange', [() => {}])
  }

  it.each(['month', 'year'] as const)('closing the calendar closes an open %s list', async (kind) => {
    const cal = await mount(1900, 2026)
    replaceHooks()

    trigger(cal, kind).click()
    fp!.close()
    await flush()
    fp!.open()
    await flush()

    expect(list(cal, kind).classList.contains('fp-yd-open')).toBe(false)
  })

  it('the month and year labels still follow navigation', async () => {
    const cal = await mount(1900, 2026)
    replaceHooks()

    fp!.changeMonth(1)
    fp!.changeYear(1990)
    await flush()

    expect(trigger(cal, 'month').textContent).toBe('July')
    expect(trigger(cal, 'year').textContent).toBe('1990')
  })
})

describe('yearDropdownPlugin - month', () => {
  it('replaces the native month select with the same trigger and list as the year', async () => {
    const cal = await mount(1900, 2026)

    expect(trigger(cal, 'month').textContent).toBe('June')
    expect(trigger(cal, 'month').className).toBe(trigger(cal, 'year').className)
    expect(options(cal, 'month').map(o => o.textContent)).toContain('January')
    // Same option class as the year list, so hover and selected look identical.
    expect(options(cal, 'month')[0].className).toContain('fp-yd-opt')
  })

  it('marks the current month as the active option when opened', async () => {
    const cal = await mount(1900, 2026)

    trigger(cal, 'month').click()

    const active = list(cal, 'month').querySelectorAll('.fp-yd-active')
    expect(active).toHaveLength(1)
    expect(active[0].textContent).toBe('June')
  })

  it('changes the calendar month when an option is picked', async () => {
    const cal = await mount(1900, 2026)

    trigger(cal, 'month').click()
    list(cal, 'month').querySelector<HTMLElement>('[data-value="2"]')!.click()

    expect(fp!.currentMonth).toBe(2)
    expect(trigger(cal, 'month').textContent).toBe('March')
    expect(list(cal, 'month').classList.contains('fp-yd-open')).toBe(false)
  })

  it('offers only the months flatpickr allows for the year on screen', async () => {
    const cal = await mountWith({ defaultDate: '2020-05-10', maxDate: '2020-08-31' }, 1900, 2030)

    trigger(cal, 'month').click()

    expect(options(cal, 'month').map(o => o.textContent)).toEqual([
      'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August',
    ])
  })

  it.each(['month', 'year'] as const)('opening the %s list scrolls only the list, never the page', async (kind) => {
    const cal = await mount(1900, 2026)
    // scrollIntoView scrolls every scrollable ancestor - including the page
    // behind a modal - so the list must position itself instead.
    const original = Element.prototype.scrollIntoView
    const scrollIntoView = vi.fn()
    Element.prototype.scrollIntoView = scrollIntoView
    try {
      trigger(cal, kind).click()

      expect(list(cal, kind).classList.contains('fp-yd-open')).toBe(true)
      expect(scrollIntoView).not.toHaveBeenCalled()
    } finally {
      Element.prototype.scrollIntoView = original
    }
  })

  it.each(['month', 'year'] as const)('a mouse wheel over the %s list scrolls the list, not the page', async (kind) => {
    const cal = await mount(1900, 2026)
    trigger(cal, kind).click()

    const event = new WheelEvent('wheel', { deltaY: 120, bubbles: true, cancelable: true })
    list(cal, kind).dispatchEvent(event)

    expect(event.defaultPrevented).toBe(true)
  })

  it('opening one list closes the other', async () => {
    const cal = await mount(1900, 2026)

    trigger(cal, 'year').click()
    trigger(cal, 'month').click()

    expect(list(cal, 'month').classList.contains('fp-yd-open')).toBe(true)
    expect(list(cal, 'year').classList.contains('fp-yd-open')).toBe(false)
  })

  it('follows the arrows: the month label updates when navigating', async () => {
    const cal = await mount(1900, 2026)

    fp!.changeMonth(1)

    expect(trigger(cal, 'month').textContent).toBe('July')
  })
})
