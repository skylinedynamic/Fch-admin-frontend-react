import { useMemo, useState, type ChangeEvent } from 'react'
import CustomDropdown from '../../../components/Common/CustomDropdown'
import {
  DEFAULT_EMBED_BACKGROUND_COLOUR,
  DEFAULT_EMBED_OPTIONS,
  DEFAULT_EMBED_PRIMARY_COLOUR,
  EMBED_BACKGROUND,
  EMBED_BACKGROUND_OPTIONS,
  EMBED_HEIGHT,
  EMBED_PREVIEW_HEIGHT,
  EMBED_RADIUS_MAX,
  type EmbedBackground,
  type EmbedDisplayOptions,
} from '../../../config/embedFormDisplay'
import { buildEmbedSnippet, buildEmbedUrl } from '../../../utils/embedSnippet'
import ColourCodeField from './ColourCodeField'
import EmbedInstructions from './EmbedInstructions'

type Props = {
  /** The form's direct link (unchanged by anything here). */
  directUrl: string
  /** The auto-height script; without it only a fixed height is offered. */
  scriptUrl: string | null | undefined
  formTitle?: string | null
}

const COPIED_FOR_MS = 2500

/**
 * Embed code a partner fits to their own site - header, footer, background,
 * frame, primary colour, height and corner radius - with a live preview. The options travel
 * in the code itself (link parameters), so each site can have its own look.
 */
export default function EmbedSnippetBuilder({ directUrl, scriptUrl, formTitle }: Props) {
  const [options, setOptions] = useState<EmbedDisplayOptions>({
    ...DEFAULT_EMBED_OPTIONS,
    autoHeight: Boolean(scriptUrl),
  })
  const [copied, setCopied] = useState(false)

  const set = <K extends keyof EmbedDisplayOptions>(key: K, value: EmbedDisplayOptions[K]) =>
    setOptions((current) => ({ ...current, [key]: value }))

  const code = useMemo(
    () => buildEmbedSnippet(directUrl, scriptUrl, options, formTitle || undefined),
    [directUrl, scriptUrl, options, formTitle],
  )
  // The primary colour box keeps what was typed while it is switched off, so
  // turning it back on brings it back; only while on does it reach the code.
  const [usePrimary, setUsePrimary] = useState(false)
  const [primaryDraft, setPrimaryDraft] = useState(DEFAULT_EMBED_PRIMARY_COLOUR)
  const togglePrimary = (on: boolean) => {
    setUsePrimary(on)
    set('primaryColor', on ? primaryDraft : '')
  }
  const changePrimary = (value: string) => {
    setPrimaryDraft(value)
    set('primaryColor', value)
  }

  const previewUrl = useMemo(() => buildEmbedUrl(directUrl, options), [directUrl, options])

  const copy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), COPIED_FOR_MS)
    })
  }

  const toggle = (key: 'header' | 'footer' | 'frame') => (event: ChangeEvent<HTMLInputElement>) =>
    set(key, event.target.checked)

  return (
    <div className="card ef-card mb-4">
      <div className="card-header ef-card__header">
        <h5 className="ef-card__title">
          <span className="ef-card__icon bg-primary-subtle text-primary">
            <i className="ri-code-box-line" />
          </span>
          <span>
            Embed on Your Website
            <span className="d-block fw-normal text-muted fs-12 mt-0.5">
              Fit the form to your site, then copy the code into WordPress, Webflow, Shopify or any page.
            </span>
          </span>
        </h5>
      </div>

      <div className="card-body p-4">
        <EmbedInstructions />

        <div className="row g-4">
          <div className="col-xl-5">
            <h6 className="fw-bold fs-13 mb-3">Look</h6>

            <div className="form-check form-switch mb-2">
              <input className="form-check-input" type="checkbox" id="ef-embed-header" checked={options.header} onChange={toggle('header')} />
              <label className="form-check-label fs-13" htmlFor="ef-embed-header">
                Show header <span className="text-muted fs-12">(logo, title, "Powered by")</span>
              </label>
            </div>
            <div className="form-check form-switch mb-2">
              <input className="form-check-input" type="checkbox" id="ef-embed-footer" checked={options.footer} onChange={toggle('footer')} />
              <label className="form-check-label fs-13" htmlFor="ef-embed-footer">
                Show footer <span className="text-muted fs-12">(copyright line)</span>
              </label>
            </div>
            <div className="form-check form-switch mb-3">
              <input className="form-check-input" type="checkbox" id="ef-embed-frame" checked={options.frame} onChange={toggle('frame')} />
              <label className="form-check-label fs-13" htmlFor="ef-embed-frame">
                Card frame <span className="text-muted fs-12">(border and shadow around the form)</span>
              </label>
            </div>

            <div className="mb-3">
              <label className="form-label fw-semibold fs-13" htmlFor="ef-embed-bg">Background</label>
              <CustomDropdown
                id="ef-embed-bg"
                options={EMBED_BACKGROUND_OPTIONS}
                optionLabel="label"
                optionValue="value"
                value={options.background}
                onChange={(value) => set('background', value as EmbedBackground)}
              />
              {options.background === EMBED_BACKGROUND.CUSTOM && (
                <ColourCodeField
                  name="Background"
                  value={options.backgroundColor}
                  fallback={DEFAULT_EMBED_BACKGROUND_COLOUR}
                  onChange={(value) => set('backgroundColor', value)}
                />
              )}
            </div>

            <div className="mb-4">
              <div className="form-check form-switch">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="ef-embed-primary"
                  checked={usePrimary}
                  onChange={(event) => togglePrimary(event.target.checked)}
                />
                <label className="form-check-label fs-13" htmlFor="ef-embed-primary">
                  Use my site's primary colour <span className="text-muted fs-12">(buttons, steps and links)</span>
                </label>
              </div>
              {usePrimary && (
                <ColourCodeField
                  name="Primary"
                  value={primaryDraft}
                  fallback={DEFAULT_EMBED_PRIMARY_COLOUR}
                  onChange={changePrimary}
                />
              )}
            </div>

            <h6 className="fw-bold fs-13 mb-3">Size</h6>

            <div className="form-check mb-2">
              <input
                className="form-check-input"
                type="radio"
                name="ef-embed-height"
                id="ef-embed-height-auto"
                checked={options.autoHeight}
                disabled={!scriptUrl}
                onChange={() => set('autoHeight', true)}
              />
              <label className="form-check-label fs-13" htmlFor="ef-embed-height-auto">
                Automatic height <span className="text-muted fs-12">(recommended - grows with the form, no inner scroll)</span>
              </label>
            </div>
            <div className="form-check mb-2">
              <input
                className="form-check-input"
                type="radio"
                name="ef-embed-height"
                id="ef-embed-height-fixed"
                checked={!options.autoHeight}
                onChange={() => set('autoHeight', false)}
              />
              <label className="form-check-label fs-13" htmlFor="ef-embed-height-fixed">Fixed height</label>
            </div>
            {!options.autoHeight && (
              <div className="input-group mb-3 ms-4" style={{ maxWidth: 200 }}>
                <input
                  type="number"
                  className="form-control"
                  aria-label="Height in pixels"
                  min={EMBED_HEIGHT.MIN}
                  max={EMBED_HEIGHT.MAX}
                  value={options.height}
                  onChange={(event) => set('height', Number(event.target.value))}
                />
                <span className="input-group-text">px</span>
              </div>
            )}

            <div className="mb-4 mt-3">
              <label className="form-label fw-semibold fs-13 d-flex justify-content-between" htmlFor="ef-embed-radius">
                <span>Corner radius</span>
                <span className="text-muted fw-normal">{options.radius}px</span>
              </label>
              <input
                type="range"
                className="form-range"
                id="ef-embed-radius"
                min={0}
                max={EMBED_RADIUS_MAX}
                value={options.radius}
                onChange={(event) => set('radius', Number(event.target.value))}
              />
            </div>

            <label className="form-label fw-semibold fs-13" htmlFor="ef-embed-code">Embed code</label>
            <textarea
              id="ef-embed-code"
              aria-label="Embed code"
              className="form-control bg-light font-monospace fs-12 text-dark p-3"
              rows={5}
              readOnly
              value={code}
              style={{ resize: 'none' }}
            />
            <button
              type="button"
              className={`btn w-100 mt-2 fw-semibold ${copied ? 'btn-success' : 'btn-primary'}`}
              onClick={copy}
            >
              {copied ? (
                <><i className="ri-check-line me-1" /> Embed Code Copied!</>
              ) : (
                <><i className="ri-code-box-line me-1" /> Copy Embed HTML</>
              )}
            </button>
            <div className="form-text fs-12 text-muted mt-2">
              Change an option? Copy the code again and replace it on your site. The direct link is not affected.
            </div>
          </div>

          <div className="col-xl-7">
            <h6 className="fw-bold fs-13 mb-3">Preview</h6>
            {/* Checks show through a transparent background, as a page would. */}
            <div
              className="p-3 border"
              style={{
                borderRadius: 4,
                backgroundColor: '#ffffff',
                backgroundImage: 'linear-gradient(45deg, #f1f5f9 25%, transparent 25%, transparent 75%, #f1f5f9 75%), linear-gradient(45deg, #f1f5f9 25%, transparent 25%, transparent 75%, #f1f5f9 75%)',
                backgroundSize: '16px 16px',
                backgroundPosition: '0 0, 8px 8px',
              }}
            >
              <iframe
                title="Embed preview"
                src={previewUrl}
                width="100%"
                height={EMBED_PREVIEW_HEIGHT}
                style={{ border: 'none', borderRadius: `${options.radius}px`, display: 'block' }}
              />
            </div>
            <div className="form-text fs-12 text-muted mt-2">
              The preview scrolls inside; on your site the form grows to its full height with automatic height.
              The preview always works here; on other sites only your Allowed Domains can show the form.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
