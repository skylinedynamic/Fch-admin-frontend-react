import type { ChangeEvent } from 'react'

type Props = {
  value: string
  error?: string | string[]
  onChange: (event: ChangeEvent<HTMLTextAreaElement>) => void
}

/**
 * Embed code for the website's /apply page - copied from Embed Form Settings,
 * like any partner's site. The API reads only the form link and options from
 * it (fch-api EmbedSnippet) and always uses the form's current key; empty
 * keeps /apply's default look.
 */
export default function ApplyFormCodeField({ value, error, onChange }: Props) {
  const message = Array.isArray(error) ? error[0] : error

  return (
    <div className="mb-0">
      <label className="form-label fw-semibold fs-13" htmlFor="apply_form_embed_code">Apply Page Form Code</label>
      <div className="input-group">
        <span
          className={`input-group-text bg-light d-flex align-items-center pt-2 ${message ? 'border-danger text-danger' : 'text-muted'}`}
          style={{ width: '42px' }}
        >
          <i className="ri-code-box-line fs-16"></i>
        </span>
        <textarea
          id="apply_form_embed_code"
          className={`form-control ps-2 font-monospace fs-12 ${message ? 'is-invalid border-danger' : ''}`}
          rows={4}
          name="apply_form_embed_code"
          value={value}
          onChange={onChange}
          placeholder='<iframe src=".../form/..." ...></iframe>'
        ></textarea>
        {message && <div className="invalid-feedback d-block mt-1">{message}</div>}
      </div>
      <div className="form-text text-muted mt-2">
        How the application form looks on the website's Apply page. In Embedded Form &gt; Configuration, choose the look, click
        "Copy Embed HTML" and paste it here. Leave empty for the default.
      </div>
    </div>
  )
}
