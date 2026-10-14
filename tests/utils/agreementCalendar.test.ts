import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import flatpickr from 'flatpickr'
import { server } from '../mocks/server'
import {
  APP_CALENDAR_HOOK,
  applyAppCalendar,
  collectCalendarCss,
  withAppCalendar,
} from '../../src/utils/agreementCalendar'

// The app's own calendar rules, as the app's stylesheets carry them.
const APP_CSS = `
  @import url("https://fonts.googleapis.com/css2?family=Poppins:wght@400&display=swap");
  @import url("https://fonts.googleapis.com/css2?family=Nunito:wght@400&display=swap");
  /* the calendar */
  .flatpickr-calendar { width: 308px; }
  .flatpickr-months { background: var(--primary-color); }
  .fp-yd-trigger { background: var(--primary-color) !important; background-image: url("data:image/svg+xml,%3Csvg%3E%3C/svg%3E") !important; }
  .flatpickr-input { background: yellow; }
  .card { color: red; content: "}"; }
  @media (max-width: 576px) { .flatpickr-calendar { width: 300px; } .card { color: blue; } }
`

// An agreement document, with its own (old) calendar theme.
const AGREEMENT_HTML = `<!DOCTYPE html><html><head>
<style>.doc { color: #111; } .flatpickr-day { border-radius: 50% !important; } .flatpickr-months { background: #3b518d; }</style>
</head><body><div class="doc"><input class="flatpickr"/></div><script>/* agreement */</script></body></html>`

let appStyle: HTMLStyleElement
const savedDefaults = { ...flatpickr.defaultConfig }
const desktop = () => vi.spyOn(window, 'matchMedia').mockImplementation(q => ({ matches: false, media: q }) as MediaQueryList)

beforeEach(() => {
  appStyle = document.head.appendChild(document.createElement('style'))
  appStyle.textContent = APP_CSS
  document.documentElement.style.setProperty('--primary-color', '#001f3f')
  document.documentElement.style.setProperty('--bs-primary-rgb', '0, 31, 63')
  document.documentElement.style.setProperty('--vz-body-font-family', '"Poppins", sans-serif')
})

afterEach(() => {
  appStyle.remove()
  document.documentElement.removeAttribute('style')
  document.body.innerHTML = ''
  flatpickr.defaultConfig = { ...savedDefaults }
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('withAppCalendar', () => {
  it('adds one script that hands the agreement to the app, and leaves the agreement as it was', () => {
    const out = withAppCalendar(AGREEMENT_HTML)

    expect(out.replace(/<script data-app-calendar>[\s\S]*?<\/script>/, '')).toBe(AGREEMENT_HTML)
    // After the agreement's own scripts (Flatpickr is loaded by then), before
    // the agreement sets up its pickers on load.
    expect(out.indexOf('data-app-calendar')).toBeGreaterThan(out.indexOf('/* agreement */'))
    expect(out.indexOf('data-app-calendar')).toBeLessThan(out.indexOf('</body>'))
    expect(typeof (window as any)[APP_CALENDAR_HOOK]).toBe('function')
  })

  it('handles a document without a closing body tag', () => {
    expect(withAppCalendar('<div>x</div>')).toMatch(/^<div>x<\/div><script data-app-calendar>/)
  })
})

describe('collectCalendarCss', () => {
  it('copies the app calendar rules and colours, not the field or page rules', async () => {
    desktop()
    const css = await collectCalendarCss()

    expect(css).toContain('--primary-color: #001f3f')
    expect(css).toContain('--bs-primary-rgb: 0, 31, 63')
    expect(css).toContain('.flatpickr-calendar { width: 308px; }')
    expect(css).toContain('.flatpickr-months { background: var(--primary-color); }')
    expect(css).not.toContain('.flatpickr-input')
    expect(css).not.toContain('.card')
    expect(css).not.toContain('the calendar')
  })

  // Chrome hands a rule like this back without its colour (as
  // "background-color:  !important"), so the rules are copied as written.
  it('copies each rule as written, so a colour set through a variable survives', async () => {
    desktop()
    const css = await collectCalendarCss()

    expect(css).toContain(
      '.fp-yd-trigger { background: var(--primary-color) !important; background-image: url("data:image/svg+xml,%3Csvg%3E%3C/svg%3E") !important; }',
    )
  })

  it('reads the app stylesheets that are linked rather than inlined', async () => {
    desktop()
    server.use(http.get('*/assets/css/calendar-test.css', () => new HttpResponse('.flatpickr-day { border-radius: 10px; }', { headers: { 'Content-Type': 'text/css' } })))
    const href = new URL('/assets/css/calendar-test.css', window.location.href).href
    const linked = { href, ownerNode: { tagName: 'LINK' } }
    const doc = new Proxy(document, {
      get: (target, key) => (key === 'styleSheets' ? [linked] : Reflect.get(target, key, target)),
    })

    expect(await collectCalendarCss(doc)).toContain('.flatpickr-day { border-radius: 10px; }')
  })

  it('imports the app font for the calendar, and only that one', async () => {
    desktop()
    const css = await collectCalendarCss()

    expect(css).toContain('@import url("https://fonts.googleapis.com/css2?family=Poppins:wght@400&display=swap");')
    expect(css).not.toContain('Nunito')
    expect(css.indexOf('@import')).toBe(0)
  })

  it('reads an unquoted import whose address holds semicolons, as the app font import is written', async () => {
    desktop()
    appStyle.textContent = '@import url(https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500&display=swap);' + APP_CSS

    const css = await collectCalendarCss()

    expect(css).toContain('@import url(https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500&display=swap);')
    expect(css).toContain('.flatpickr-calendar { width: 308px; }')
  })

  // The agreement sits in a frame, which can be narrower than the screen. Its
  // calendar follows the screen the app is on, like every other calendar.
  it('on a desktop, leaves out the phone-only calendar rules', async () => {
    desktop()

    expect(await collectCalendarCss()).not.toContain('width: 300px')
  })

  it('on a phone, applies the phone calendar rules, whatever the frame width', async () => {
    vi.spyOn(window, 'matchMedia').mockImplementation(q => ({ matches: q === '(max-width: 576px)', media: q }) as MediaQueryList)

    const css = await collectCalendarCss()

    expect(css).toContain('.flatpickr-calendar { width: 300px; }')
    expect(css).not.toContain('@media')
    expect(css).not.toContain('.card')
  })
})

describe('applyAppCalendar (inside the agreement frame)', () => {
  const frame = () => {
    const iframe = document.body.appendChild(document.createElement('iframe'))
    const doc = iframe.contentDocument!
    doc.open(); doc.write(AGREEMENT_HTML); doc.close()
    const win = iframe.contentWindow as Window & { flatpickr?: typeof flatpickr }
    // The agreement loads its own Flatpickr.
    win.flatpickr = flatpickr
    return { win, doc }
  }
  const rulesOf = (doc: Document) =>
    Array.from(doc.styleSheets).flatMap(s => Array.from(s.cssRules).map(r => r.cssText))

  it('takes out the agreement own calendar theme, keeping the rest of its styles', async () => {
    desktop()
    const { win, doc } = frame()

    await applyAppCalendar(win)

    const own = Array.from(doc.querySelector<HTMLStyleElement>('style:not([data-app-calendar])')!.sheet!.cssRules).map(r => r.cssText)
    expect(own.join(' ')).toContain('.doc')
    expect(own.join(' ')).not.toContain('flatpickr')
  })

  it('brings in the app calendar design', async () => {
    desktop()
    const { win, doc } = frame()

    await applyAppCalendar(win)

    const all = rulesOf(doc).join(' ')
    expect(all).toContain('width: 308px')
    expect(all).toContain('--primary-color: #001f3f')
    expect(all).not.toContain('#3b518d')
  })

  it('gives the agreement date pickers the app month and year dropdowns', async () => {
    desktop()
    const { win } = frame()

    void applyAppCalendar(win)
    vi.useFakeTimers()
    // A picker made by the agreement's Flatpickr. (On a field of this test's
    // own page: the Flatpickr given to the frame here belongs to this page and
    // cannot set up the frame's fields; the agreement's own copy, in the real
    // frame, does.)
    const input = document.body.appendChild(document.createElement('input'))
    const fp = win.flatpickr!(input, { dateFormat: 'd M, Y' }) as flatpickr.Instance
    vi.runAllTimers()

    expect(fp.calendarContainer.querySelector('.fp-yd-trigger[data-kind="month"]')).not.toBeNull()
    expect(fp.calendarContainer.querySelector('.fp-yd-trigger[data-kind="year"]')).not.toBeNull()
    fp.destroy()
  })

  it('is applied once, however often the agreement asks', async () => {
    desktop()
    const { win, doc } = frame()

    await Promise.all([applyAppCalendar(win), applyAppCalendar(win)])

    expect(doc.querySelectorAll('style[data-app-calendar]')).toHaveLength(1)
  })
})
