import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { containWheel } from '../../utils/containWheel'
import '../../../assets/css/time-field.css'

interface TimeFieldProps {
  /** "HH:mm" in 24-hour form, exactly as <input type="time"> reports it, or ''. */
  value: string
  onChange: (value: string) => void
  className?: string
  id?: string
}

type Kind = 'hour' | 'minute' | 'period'

const HOURS = ['12', ...Array.from({ length: 11 }, (_, i) => String(i + 1).padStart(2, '0'))]
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'))
const PERIODS = ['AM', 'PM']

const pad = (n: number) => String(n).padStart(2, '0')

/** "22:59" -> { hour: '10', minute: '59', period: 'PM' }; '' -> nothing chosen yet. */
const toParts = (value: string) => {
  const [h, m] = value.split(':').map(Number)
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null
  return { hour: pad(h % 12 === 0 ? 12 : h % 12), minute: pad(m), period: h >= 12 ? 'PM' : 'AM' }
}

const fromParts = ({ hour, minute, period }: { hour: string; minute: string; period: string }) => {
  const h12 = Number(hour) % 12
  return `${pad(period === 'PM' ? h12 + 12 : h12)}:${minute}`
}

/** One scrolling column of options, in the calendar dropdowns' design. */
function Column({ kind, options, active, onPick }: { kind: Kind; options: string[]; active?: string; onPick: (v: string) => void }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => (ref.current ? containWheel(ref.current) : undefined), [])

  // Like the browser's own picker: the chosen value starts at the top.
  useLayoutEffect(() => {
    const el = ref.current
    const current = el?.querySelector<HTMLElement>('.fp-yd-active')
    if (el && current) el.scrollTop = current.offsetTop
  }, [])

  return (
    <div ref={ref} className="time-field__column" data-kind={kind} role="listbox" aria-label={kind}>
      {options.map(option => (
        <div
          key={option}
          role="option"
          aria-selected={option === active}
          className={'fp-yd-opt' + (option === active ? ' fp-yd-active' : '')}
          onClick={() => onPick(option)}
        >
          {option}
        </div>
      ))}
    </div>
  )
}

/**
 * A time input whose picker uses the app's design.
 *
 * The browser's own time picker (the popup of <input type="time">) is drawn by
 * the browser in its own accent colour, which page CSS cannot reliably change.
 * This keeps the native input - so a time can still be typed, and the value
 * stays "HH:mm" - but replaces the browser's clock button with one that opens
 * the same hour / minute / AM-PM columns, styled like the calendar month/year
 * dropdowns (.fp-yd-* in custom.min.css): primary colour for the selected
 * value, a primary tint on hover.
 */
export default function TimeField({ value, onChange, className = 'form-control', id }: TimeFieldProps) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onMouseDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onMouseDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onMouseDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const parts = toParts(value)
  // An empty field takes the other parts as 12, 00 and AM, so one pick
  // already makes a whole time.
  const pick = (kind: Kind, option: string) =>
    onChange(fromParts({ hour: '12', minute: '00', period: 'AM', ...parts, [kind]: option }))

  return (
    <div className="time-field" ref={wrapRef}>
      <input
        id={id}
        type="time"
        className={`${className} time-field__input`}
        value={value}
        onChange={e => onChange(e.target.value)}
      />
      <button
        type="button"
        className="time-field__button"
        aria-label="Choose time"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
      >
        <i className="ri-time-line" />
      </button>
      {open && (
        <div className="time-field__panel">
          <Column kind="hour" options={HOURS} active={parts?.hour} onPick={v => pick('hour', v)} />
          <Column kind="minute" options={MINUTES} active={parts?.minute} onPick={v => pick('minute', v)} />
          <Column kind="period" options={PERIODS} active={parts?.period} onPick={v => pick('period', v)} />
        </div>
      )}
    </div>
  )
}
