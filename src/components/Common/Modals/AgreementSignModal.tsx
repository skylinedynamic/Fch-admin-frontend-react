import React, { useEffect, useState } from 'react'
import { checkAgreementSign, submitAgreementSign } from '../../../modules/agreement/services'

/**
 * AgreementSignModal
 * 
 * Enhanced premium split-layout in light theme.
 * Uses app primary color (#405189) and platform-contextual text.
 */

interface TemplateInfo {
  id: number
  slug: string
  template_html: string
}

export default function AgreementSignModal() {
  const [visible, setVisible] = useState(false)
  const [template, setTemplate] = useState<TemplateInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  /* Primary App Color Constants */
  const APP_PRIMARY = '#405189'
  const APP_SUCCESS = '#0AB39C' // Default Bootstrap success in the theme
  const APP_BG_SOFT = '#F3F6F9'

  useEffect(() => {
    let cancelled = false
    async function check() {
      try {
        const res = await checkAgreementSign()
        if (!cancelled && res?.status && res.data?.needs_sign && res.data?.template) {
          setTemplate(res.data.template)
          setVisible(true)
        }
      } catch (err) {
        console.error("Agreement check failed:", err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    check()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (visible) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [visible])

  const iframeRef = React.useRef<HTMLIFrameElement>(null)

  async function handleSubmit() {
    if (!template || !agreed) return

    // Reach into iframe to trigger native validation
    const iframe = iframeRef.current
    if (iframe && (iframe.contentWindow || iframe.contentDocument)) {
      const win = iframe.contentWindow as any
      // If our custom validation script is ready, use it
      if (win && typeof win.validateDoc === 'function') {
        const result = win.validateDoc()
        if (!result.valid) {
          setError('Mandatory fields missing: Please complete all highlighted fields in the document.')
          setSubmitting(false)
          return
        }
      } 
      // Fallback: Check if there's any required field manually if the script isn't ready
      else if (iframe.contentDocument) {
        const reqs = iframe.contentDocument.querySelectorAll('[required]') as any
        for (let r of reqs) {
           if (!r.value || !r.value.trim() || (r.type === 'checkbox' && !r.checked)) {
             setError('Please complete all required fields.')
             setSubmitting(false)
             return
           }
        }
      }
    }

    setSubmitting(true)
    setError(null)
    try {
      const res = await submitAgreementSign({ agreement_template_id: template.id })
      if (res?.status) {
        setSuccess(true)
        setTimeout(() => {
          setVisible(false)
          window.location.reload()
        }, 1500)
      } else {
        setError(res?.message || 'Failed to submit agreement.')
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'An error occurred.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!visible || !template) return null

  return (
    <>
      <style>{`
        @keyframes asm-spin { to { transform: rotate(360deg); } }
        .asm-iframe {
           width: 100%;
           height: 100%;
           border: 1px solid #E9EBEC;
           background: #F8F9FA;
           border-radius: 6px;
        }
        .asm-btn { transition: all 0.3s ease; }
        .asm-btn:active { transform: scale(0.98); }
        .asm-btn:not(:disabled):hover { 
           background-color: #364474 !important; /* Darker primary */
           box-shadow: 0 4px 12px rgba(64, 81, 137, 0.25);
        }
      `}</style>

      {/* ── Overlay ── */}
      <div style={styles.overlay} />

      {/* ── Main Container ── */}
      <div style={styles.mainWrapper} role="dialog" aria-modal="true">
        <div style={styles.modalCard}>

          {/* Sidebar / Info Panel (Light, Sharp Borders) */}
          <div style={styles.sideInfo}>
            <div style={styles.brandArea}>
              <div style={{ ...styles.brandIcon, background: APP_PRIMARY }}>
                <i className="ri-shield-keyhole-fill" />
              </div>
              <div style={styles.brandName}>FCH ADMIN</div>
            </div>

            <div style={styles.stepBox}>
              <div style={{ ...styles.stepNum, color: APP_PRIMARY }}>Compliance Protocol</div>
              <h2 style={styles.stepTitle}>Platform Security & Verification</h2>
              <p style={styles.stepDesc}>
                Welcome to <strong>FCH ADMIN</strong>. To ensure a compliant and secure environment for all financial operations, we require every partner to certify they have reviewed our cooperation agreement.
              </p>
            </div>

            <div style={styles.legalList}>
              <div style={styles.legalItem}>
                <div style={{ ...styles.legalIcon, color: APP_PRIMARY }}><i className="ri-database-2-line" /></div>
                <div>
                  <div style={styles.legalTextTerm}>Data Privacy</div>
                  <div style={styles.legalTextDesc}>Encryption standards protect all sensitive transaction data.</div>
                </div>
              </div>
              <div style={styles.legalItem}>
                <div style={{ ...styles.legalIcon, color: APP_PRIMARY }}><i className="ri-file-shield-2-line" /></div>
                <div>
                  <div style={styles.legalTextTerm}>Financial Integrity</div>
                  <div style={styles.legalTextDesc}>Adherence to AML and global KYC verification standards.</div>
                </div>
              </div>
              <div style={styles.legalItem}>
                <div style={{ ...styles.legalIcon, color: APP_PRIMARY }}><i className="ri-quill-pen-line" /></div>
                <div>
                  <div style={styles.legalTextTerm}>Legally Binding</div>
                  <div style={styles.legalTextDesc}>This signature constitutes a valid digital contract.</div>
                </div>
              </div>
            </div>

            <div style={styles.sideFooter}>
              © 2026 Four Corner Holding. Certified Platform.
            </div>
          </div>

          {/* Right Area: Document & Action */}
          <div style={styles.contentArea}>

            {/* Header for content area */}
            <div style={styles.contentHeader}>
              <div style={styles.contentTitle}>Agreement Signing</div>
              <div style={styles.headerMeta}>MANDATORY ACTION</div>
            </div>

            {/* Document Frame */}
            <div style={styles.documentFrame}>
              <iframe
                ref={iframeRef}
                className="asm-iframe"
                title="Agreement Content"
                srcDoc={template.template_html}
              />
            </div>

            {/* Sticky Action Footer */}
            <div style={styles.actionFooter}>
              <div style={styles.actionFlex}>
                <label style={styles.checkboxContainer}>
                  <input
                    type="checkbox"
                    style={styles.hiddenCheckbox}
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    disabled={submitting || success}
                  />
                  <div style={{ ...styles.customCheckbox, ...(agreed ? { background: APP_PRIMARY, borderColor: APP_PRIMARY } : {}) }}>
                    {agreed && <i className="ri-check-line" style={{ color: '#fff', fontSize: '14px' }} />}
                  </div>
                  <span style={styles.checkboxLabel}>
                    I confirm that I have reviewed the entirety of this agreement and agree to be bound by its terms.
                  </span>
                </label>

                <div style={styles.buttonGroups}>
                  {error && <div style={styles.errorText}><i className="ri-error-warning-fill" /> {error}</div>}

                  {success ? (
                    <div style={{ ...styles.successBadge, color: APP_SUCCESS, border: `1px solid ${APP_SUCCESS}20`, background: `${APP_SUCCESS}10` }}>
                      <i className="ri-checkbox-circle-fill" /> Signature Saved
                    </div>
                  ) : (
                    <button
                      onClick={handleSubmit}
                      disabled={!agreed || submitting}
                      className="asm-btn"
                      style={{ ...styles.btnSubmit, background: APP_PRIMARY, ...((!agreed || submitting) ? styles.btnDisabled : {}) }}
                    >
                      {submitting ? (
                        <><span style={styles.spinner} /> Processing...</>
                      ) : (
                        <><i className="ri-quill-pen-line" /> Accept & Continue</>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </>
  )
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.15)',
    backdropFilter: 'blur(2px)',
    zIndex: 99998,
  },
  mainWrapper: {
    position: 'fixed',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 99999,
    padding: '40px',
  },
  modalCard: {
    width: '100%',
    maxWidth: '1200px',
    height: '100%',
    maxHeight: '850px',
    background: '#ffffff',
    borderRadius: '4px',
    display: 'flex',
    overflow: 'hidden',
    boxShadow: '0 10px 30px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)',
    border: '1px solid #E9EBEC',
  },
  sideInfo: {
    width: '300px',
    background: '#F3F6F9',
    padding: '25px',
    display: 'flex',
    flexDirection: 'column',
    borderRight: '1px solid #E9EBEC',
    flexShrink: 0,
  },
  brandArea: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '50px',
  },
  brandIcon: {
    width: '34px',
    height: '34px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontSize: '20px',
    boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
  },
  brandName: {
    fontWeight: 800,
    fontSize: '17px',
    color: '#405189',
    letterSpacing: '0.05em',
  },
  stepBox: {
    marginBottom: '40px',
  },
  stepNum: {
    fontSize: '10px',
    fontWeight: 800,
    textTransform: 'uppercase',
    letterSpacing: '1.5px',
    marginBottom: '8px',
  },
  stepTitle: {
    fontSize: '21px',
    fontWeight: 700,
    color: '#212529',
    marginBottom: '16px',
    lineHeight: '1.3',
  },
  stepDesc: {
    fontSize: '14px',
    color: '#495057',
    lineHeight: '1.6',
  },
  legalList: {
    marginTop: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  legalItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
  },
  legalIcon: {
    width: '32px',
    height: '32px',
    background: '#ffffff',
    border: '1px solid #E9EBEC',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
    flexShrink: 0,
    boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
  },
  legalTextTerm: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#212529',
    marginBottom: '2px',
  },
  legalTextDesc: {
    fontSize: '12px',
    color: '#878A99',
    lineHeight: '1.4',
  },
  sideFooter: {
    marginTop: '40px',
    fontSize: '11px',
    color: '#878A99',
    lineHeight: '1.5',
  },
  contentArea: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    background: '#ffffff',
    position: 'relative',
  },
  contentHeader: {
    padding: '24px 30px 18px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottom: '1px solid #E9EBEC',
  },
  contentTitle: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#212529',
  },
  headerMeta: {
    fontSize: '10px',
    fontWeight: 800,
    color: '#F06548',
    background: '#FDF2F0',
    padding: '3px 10px',
    border: '1px solid #FAD9D3',
    borderRadius: '4px',
    letterSpacing: '0.5px',
  },
  documentFrame: {
    flex: 1,
    padding: '20px 30px',
    background: '#F8F9FA',
    overflow: 'hidden',
  },
  actionFooter: {
    padding: '20px 30px 24px',
    background: '#ffffff',
    borderTop: '1px solid #E9EBEC',
  },
  actionFlex: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '30px',
  },
  checkboxContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    cursor: 'pointer',
    flex: 1,
  },
  hiddenCheckbox: {
    display: 'none',
  },
  customCheckbox: {
    width: '19px',
    height: '19px',
    borderRadius: '4px',
    border: '2px solid #CED4DA',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    transition: 'all 0.15s ease-in-out',
    background: '#fff',
  },
  checkboxLabel: {
    fontSize: '13.5px',
    fontWeight: 500,
    color: '#495057',
    lineHeight: '1.5',
  },
  buttonGroups: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '8px',
  },
  btnSubmit: {
    padding: '11px 28px',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontWeight: 600,
    fontSize: '14.5px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    cursor: 'pointer',
    boxShadow: '0 3px 5px rgba(64, 81, 137, 0.1)',
  },
  btnDisabled: {
    background: '#E9EBEC',
    color: '#878A99',
    cursor: 'not-allowed',
    boxShadow: 'none',
  },
  errorText: {
    color: '#F06548',
    fontSize: '12px',
    fontWeight: 500,
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  successBadge: {
    padding: '9px 20px',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  spinner: {
    display: 'inline-block',
    width: '16px',
    height: '16px',
    border: '2px solid rgba(255,255,255,0.3)',
    borderTopColor: '#fff',
    borderRadius: '50%',
    animation: 'asm-spin 0.6s linear infinite',
  },
}
