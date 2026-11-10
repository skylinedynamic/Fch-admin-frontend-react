import { useState, type ReactNode } from 'react'

/** The four steps, as a partner would follow them. */
const STEPS: { icon: string; title: string; text: ReactNode }[] = [
  {
    icon: 'ri-palette-line',
    title: 'Choose the look',
    text: 'Header, footer, background, your primary colour, height and corners. The preview shows the result.',
  },
  {
    icon: 'ri-file-copy-line',
    title: 'Copy the code',
    text: <>Click <strong>Copy Embed HTML</strong>. With automatic height it is two lines - keep them together.</>,
  },
  {
    icon: 'ri-code-s-slash-line',
    title: 'Paste it on your page',
    text: 'Add it to your page where the form should appear (see below), then publish the page.',
  },
  {
    icon: 'ri-shield-check-line',
    title: 'Allow your domain',
    text: <>Add your website to <strong>Allowed Domains</strong> above and save. With none listed, it shows anywhere.</>,
  },
]

const TIPS = [
  'Keep both lines of the code together - without the <script> line the form cannot grow to its full height.',
  'Changed an option, or regenerated the key? Copy it again and replace the old code on your site.',
  'The Direct Shareable Link is not affected by these options - share it by email or SMS as it is.',
]

const RADIUS = { borderRadius: 4 }

/**
 * How to put the embedded application on a website, at the top of the Embed
 * on Your Website card. It can be hidden once the partner knows the way.
 */
export default function EmbedInstructions() {
  const [open, setOpen] = useState(true)

  return (
    <section aria-labelledby="ef-embed-howto-title" className="border mb-4" style={RADIUS}>
      <div className="d-flex align-items-center justify-content-between gap-2 px-3 py-2 bg-light border-bottom">
        <h6 id="ef-embed-howto-title" className="fw-semibold fs-13 mb-0 d-flex align-items-center gap-2">
          <i className="ri-guide-line text-primary fs-16" aria-hidden="true" />
          How to add the form to your website
        </h6>
        <button
          type="button"
          className="btn btn-link btn-sm text-decoration-none text-nowrap fs-12 p-0"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? 'Hide guide' : 'Show guide'}
          <i className={`ms-1 ${open ? 'ri-arrow-up-s-line' : 'ri-arrow-down-s-line'}`} aria-hidden="true" />
        </button>
      </div>

      {open && (
        <div className="p-3">
          <ol className="row g-3 list-unstyled mb-3" aria-label="Steps">
            {STEPS.map((step, index) => (
              <li key={step.title} className="col-md-6 col-xl-3">
                <div className="h-100 border p-3" style={RADIUS}>
                  <div className="d-flex align-items-center gap-2 mb-2">
                    <span
                      className="d-inline-flex align-items-center justify-content-center bg-primary text-white fw-semibold fs-12 flex-shrink-0"
                      style={{ width: 24, height: 24, ...RADIUS }}
                      aria-hidden="true"
                    >
                      {index + 1}
                    </span>
                    <span className="fw-semibold fs-13">{step.title}</span>
                    <i className={`${step.icon} text-primary fs-16 ms-auto`} aria-hidden="true" />
                  </div>
                  <p className="text-muted fs-12 mb-0">{step.text}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="d-flex gap-2 bg-light px-3 py-2 mb-3 fs-12" style={RADIUS}>
            <i className="ri-information-line text-primary fs-16 lh-1 flex-shrink-0" aria-hidden="true" />
            <p className="mb-0">
              <span className="fw-semibold">Where to paste it: </span>
              <span className="text-muted">
                open the page in your website's editor and add an "HTML", "Code" or "Embed" block where the form should
                appear - most website builders have one. Paste the code into it and publish. On a hand-built site, paste
                it into the page's HTML in the same place.
              </span>
            </p>
          </div>

          <div className="alert alert-info border-0 fs-12 mb-0 py-2 px-3" style={RADIUS} role="note">
            <ul className="mb-0 ps-3">
              {TIPS.map((tip) => (
                <li key={tip}>{tip}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </section>
  )
}
