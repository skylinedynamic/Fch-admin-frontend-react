import { EMBED_COLOUR_PATTERN } from '../../../config/embedFormDisplay'

type Props = {
  /** What the colour is for, e.g. "Background" - names both inputs. */
  name: string
  value: string
  /** Shown in the picker while the typed code is not a colour yet. */
  fallback: string
  onChange: (value: string) => void
}

/** True for a code the form reads: '#' (optional) and six hex digits. */
const isColourCode = (value: string) => EMBED_COLOUR_PATTERN.test(value.trim())

/**
 * A colour picker beside a "#rrggbb" box, kept in step. A code the form would
 * not read is marked under the box; the embed code then leaves it out.
 */
export default function ColourCodeField({ name, value, fallback, onChange }: Props) {
  const valid = isColourCode(value)
  const pickerValue = valid ? `#${value.trim().replace('#', '').toLowerCase()}` : fallback

  return (
    <div className="d-flex align-items-start gap-2 mt-2">
      <input
        type="color"
        className="form-control form-control-color flex-shrink-0"
        aria-label={`Pick ${name.toLowerCase()} colour`}
        value={pickerValue}
        onChange={(event) => onChange(event.target.value)}
      />
      <div className="flex-grow-1">
        <input
          type="text"
          className={`form-control font-monospace ${valid ? '' : 'is-invalid'}`}
          aria-label={`${name} colour code`}
          placeholder="#f5f7fa"
          maxLength={7}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
        {!valid && <div className="invalid-feedback d-block">Enter a six-digit colour code, such as #f5f7fa.</div>}
      </div>
    </div>
  )
}
