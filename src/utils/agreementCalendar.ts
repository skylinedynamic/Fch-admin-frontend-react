import { yearDropdownPlugin } from './flatpickrPlugins'

/**
 * The app's calendar inside an agreement.
 *
 * An agreement is its own HTML document (AgreementBuilder/utils.ts →
 * getAgreementHtml), shown in an iframe: in the builder's preview and in the
 * partner and borrower signing modals. It loads Flatpickr itself and carried
 * its own calendar theme, so its date fields opened a different calendar from
 * every other one in the app - and saved agreements keep that theme in their
 * HTML.
 *
 * withAppCalendar() adds one small script to the agreement as it is shown.
 * That script calls back to the page showing it (applyAppCalendar), which
 * swaps the agreement's calendar theme for the app's own calendar rules -
 * copied from the app's stylesheets, so the two cannot drift apart - and gives
 * its date pickers the app's month/year dropdowns. Only the calendar changes:
 * the agreement's fields, layout and saved HTML stay as they are.
 *
 * The borrower (client-fch) and partner (Fch-admin-frontend-react) portals
 * carry identical copies of this file; keep the two in sync.
 */
export const APP_CALENDAR_HOOK = '__fchApplyAppCalendar'

const MARK = 'data-app-calendar'

/** Years the agreement date pickers offer: 1900 to ten years ahead, as in the builder. */
const YEARS_AHEAD = 10

/** The variables the calendar rules are drawn with, even when no copied rule names them directly. */
const BASE_VARIABLES = ['--primary-color', '--bs-primary-rgb', '--vz-body-font-family']

// Parts of the calendar popup - not the input field it opens from, which is
// part of the agreement's own design.
const CALENDAR_PART = /flatpickr-(?!input|mobile|wrapper)|dayContainer|numInputWrapper|cur-year|cur-month|arrowUp|arrowDown|fp-yd-|fp-md-|fp-has-custom/
const FIELD_PART = /flatpickr-input/

const isCalendarSelector = (selector: string) => CALENDAR_PART.test(selector) && !FIELD_PART.test(selector)

/* ── Reading the app's stylesheets ─────────────────────────────────────── */

interface Block {
  /** The selector or at-rule before the braces (or the whole statement, for @import). */
  prelude: string
  /** What is between the braces; undefined for a statement such as @import. */
  body?: string
}

const stripComments = (text: string) => text.replace(/\/\*[\s\S]*?\*\//g, '')

/** Splits CSS text into its top-level rules, leaving each one's text as written. */
const splitBlocks = (css: string): Block[] => {
  const blocks: Block[] = []
  let depth = 0
  let start = 0
  let bodyStart = 0
  for (let i = 0; i < css.length; i++) {
    const c = css[i]
    if (c === '/' && css[i + 1] === '*') {
      const end = css.indexOf('*/', i + 2)
      i = end === -1 ? css.length : end + 1
    } else if (c === '"' || c === "'") {
      for (i++; i < css.length && css[i] !== c; i++) if (css[i] === '\\') i++
    } else if ((c === 'u' || c === 'U') && /^url\(\s*[^"'\s]/i.test(css.slice(i, i + 6))) {
      // An unquoted url(...) may hold ; and other characters (a font
      // address such as ...wght@300;400), so it is skipped as a whole.
      const end = css.indexOf(')', i)
      i = end === -1 ? css.length : end
    } else if (c === '{') {
      if (depth++ === 0) bodyStart = i
    } else if (c === '}') {
      if (--depth === 0) {
        blocks.push({ prelude: stripComments(css.slice(start, bodyStart)).trim(), body: css.slice(bodyStart + 1, i) })
        start = i + 1
      }
    } else if (c === ';' && depth === 0) {
      blocks.push({ prelude: stripComments(css.slice(start, i)).trim() })
      start = i + 1
    }
  }
  return blocks
}

/**
 * The calendar rules in a stylesheet's text, as written. A media rule (the
 * phone layout, say) is decided here against the app's own window, rather
 * than copied: inside the agreement frame it would be measured against the
 * frame, which can be narrower than the screen - and the agreement calendar
 * should follow the screen the app is on, like every other calendar.
 */
const calendarRules = (css: string, win: Window): string[] =>
  splitBlocks(css).flatMap(({ prelude, body }) => {
    if (body === undefined) return []
    if (prelude.startsWith('@media')) {
      return win.matchMedia(prelude.slice('@media'.length).trim()).matches ? calendarRules(body, win) : []
    }
    if (prelude.startsWith('@')) return []
    return isCalendarSelector(prelude) ? [`${prelude} {${body}}`] : []
  })

/** The font the calendar is set in, imported the way the app imports it. */
const fontImports = (css: string, family: string): string[] => {
  const name = family.split(',')[0].trim().replace(/^['"]|['"]$/g, '').replace(/ /g, '+')
  if (!name) return []
  return splitBlocks(css)
    .filter(({ prelude, body }) => body === undefined && prelude.startsWith('@import'))
    .map(({ prelude }) => prelude)
    .filter(statement => /fonts\.googleapis\.com/.test(statement) && statement.includes(`family=${name}`))
    .map(statement => `${statement};`)
}

// Fetched once per stylesheet; the browser has normally cached them already.
const linkedText = new Map<string, Promise<string>>()

/**
 * A stylesheet's text, as written: an inline <style>'s own text, or the app's
 * own linked file. Not read back through the CSSOM - Chrome hands a rule such
 * as "background: var(--primary-color); background-image: url(...)" back
 * without its colour. Another site's stylesheet (a CDN) is skipped; the
 * agreement loads Flatpickr's base stylesheet itself.
 */
const sourceOf = (sheet: StyleSheet): Promise<string> => {
  const owner = sheet.ownerNode as Element | null
  if (owner?.tagName === 'STYLE') return Promise.resolve(owner.textContent ?? '')
  const href = sheet.href
  if (!href || new URL(href, window.location.href).origin !== window.location.origin) return Promise.resolve('')
  if (!linkedText.has(href)) {
    linkedText.set(href, fetch(href).then(r => (r.ok ? r.text() : '')).catch(() => ''))
  }
  return linkedText.get(href)!
}

/**
 * The app's calendar rules, from the stylesheets the app has loaded, with the
 * colour and font variables they use set to the app's current values.
 */
export const collectCalendarCss = async (doc: Document = document): Promise<string> => {
  const win = doc.defaultView ?? window
  const texts = await Promise.all(Array.from(doc.styleSheets).map(sourceOf))
  const body = texts.flatMap(css => calendarRules(css, win)).join('\n')

  const root = win.getComputedStyle(doc.documentElement)
  const used = Array.from(body.matchAll(/var\((--[\w-]+)/g), m => m[1])
  const variables = Array.from(new Set([...BASE_VARIABLES, ...used]))
    .map(name => [name, root.getPropertyValue(name).trim()] as const)
    .filter(([, value]) => value)
    .map(([name, value]) => `${name}: ${value};`)

  const family = root.getPropertyValue('--vz-body-font-family').trim()
  const imports = Array.from(new Set(texts.flatMap(css => fontImports(css, family))))
  return [...imports, `:root { ${variables.join(' ')} }`, body].join('\n')
}

/* ── Inside the agreement ──────────────────────────────────────────────── */

const isMediaRule = (rule: CSSRule): rule is CSSMediaRule =>
  'media' in rule && 'cssRules' in rule && !('styleSheet' in rule)

/** Removes the agreement's own calendar rules, from its own <style> blocks. */
const removeOwnCalendarTheme = (doc: Document) => {
  const strip = (owner: CSSStyleSheet | CSSMediaRule) => {
    const rules = Array.from(owner.cssRules)
    for (let i = rules.length - 1; i >= 0; i--) {
      const selector = (rules[i] as CSSStyleRule).selectorText
      if (typeof selector === 'string' && isCalendarSelector(selector)) owner.deleteRule(i)
      else if (isMediaRule(rules[i])) strip(rules[i] as CSSMediaRule)
    }
  }
  Array.from(doc.styleSheets)
    .filter(sheet => (sheet.ownerNode as Element | null)?.tagName === 'STYLE' && !(sheet.ownerNode as Element).hasAttribute(MARK))
    .forEach(sheet => strip(sheet as CSSStyleSheet))
}

type AgreementWindow = Window & { flatpickr?: { setDefaults: (config: Record<string, unknown>) => void } }

/**
 * Called from inside the agreement (see withAppCalendar), before it sets up
 * its date pickers. The pickers get the app's dropdowns straight away; the
 * app's calendar styles follow as soon as they are read, long before anyone
 * can open a date field.
 */
export const applyAppCalendar = async (win: Window): Promise<void> => {
  const doc = win.document
  if (doc.querySelector(`style[${MARK}]`)) return

  const style = doc.createElement('style')
  style.setAttribute(MARK, '')
  doc.head.appendChild(style)

  ;(win as AgreementWindow).flatpickr?.setDefaults({
    monthSelectorType: 'dropdown',
    plugins: [yearDropdownPlugin(1900, new Date().getFullYear() + YEARS_AHEAD)],
  })

  removeOwnCalendarTheme(doc)
  style.textContent = await collectCalendarCss()
}

const HOOK_SCRIPT =
  `<script ${MARK}>(function(){try{var apply=window.parent&&window.parent['${APP_CALENDAR_HOOK}'];` +
  `if(apply)apply(window)}catch(e){}})()</script>`

/**
 * The agreement HTML to put in an iframe, with the app's calendar. The script
 * goes at the end of the body: after the agreement has loaded Flatpickr, and
 * before it sets up its pickers (it waits for the page to finish loading).
 */
export const withAppCalendar = (html: string): string => {
  ;(window as unknown as Record<string, unknown>)[APP_CALENDAR_HOOK] = applyAppCalendar
  // Start reading the app's stylesheets now, so they are ready by the time
  // the agreement asks for them.
  void collectCalendarCss()
  const end = html.toLowerCase().lastIndexOf('</body>')
  return end === -1 ? html + HOOK_SCRIPT : html.slice(0, end) + HOOK_SCRIPT + html.slice(end)
}
