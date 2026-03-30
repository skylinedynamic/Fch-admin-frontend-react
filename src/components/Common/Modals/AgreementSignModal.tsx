import React, { useEffect, useState } from 'react'
import { checkAgreementSign, submitAgreementSign } from '../../../modules/agreement/services'
import { useAuthStore } from '../../../store/auth/authStore'
import '../../../../assets/css/agreement-builder.css'
// @ts-ignore
import { AgreementSignModalLoader } from '../../Loader/AgreementLoader.jsx'

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

  const { user, setCredentials } = useAuthStore()

  useEffect(() => {
    let cancelled = false
    async function check() {
      // No need to call check API if user is already signed according to their session
      if (user?.is_agreement_signed) return;

      try {
        const res = await checkAgreementSign()
        if (!cancelled && res?.status && res.data?.needs_sign && res.data?.template) {
          setTemplate(res.data.template)
          setVisible(true)
        }
      } catch (err) { } finally {
        if (!cancelled) setLoading(false)
      }
    }
    check()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    // Only lock scroll if modal is actually visible AND has content
    const needsLock = visible && template;
    const sbWrappers = document.querySelectorAll('.simplebar-content-wrapper');

    if (needsLock) {
      document.body.style.overflow = 'hidden';
      // Force SimpleBar to lock if present
      sbWrappers.forEach((el: any) => el.style.setProperty('overflow', 'hidden', 'important'));
    } else {
      document.body.style.overflow = '';
      // Release SimpleBar if present
      sbWrappers.forEach((el: any) => el.style.setProperty('overflow', 'auto', ''));
      // Force layout recalculation
      window.dispatchEvent(new Event('resize'));
    }

    return () => {
      document.body.style.overflow = '';
      sbWrappers.forEach((el: any) => el.style.setProperty('overflow', 'auto', ''));
      window.dispatchEvent(new Event('resize'));
    };
  }, [visible, template])

  const iframeRef = React.useRef<HTMLIFrameElement>(null)

  /* Hot-patch the iframe with latest high-fidelity validation & styles */
  useEffect(() => {
    if (!template || !visible) return;
    const timer = setTimeout(() => {
      const iframe = iframeRef.current;
      if (iframe && iframe.contentDocument) {
        const head = iframe.contentDocument.head;

        // 1. Inject Latest CSS
        const style = iframe.contentDocument.createElement('style');
        style.id = 'force-premium-css';
        style.textContent = `
             .is-invalid { border-color: #F06548 !important; background-color: #fff5f5 !important;box-shadow: none !important; animation: asm-shake 0.3s ease-in-out; }
             .p-field.is-invalid { background-color: #FFF5F5 !important; border-radius: 12px; padding: 10px !important; }
             .p-field.is-invalid .p-sig-box { border: none !important; background: transparent !important; }
             .p-error { display: none !important; }
             @keyframes asm-shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-3px); } 75% { transform: translateX(3px); } }
           `;
        head.appendChild(style);

        // 2. Inject Robust Validation & Extraction Script
        const script = iframe.contentDocument.createElement('script');
        script.textContent = "window.validateDoc = function() {" +
          "var form = document.querySelector('form') || document.body;" +
          "var requiredFields = form.querySelectorAll('input[required], textarea[required], select[required]');" +
          "var firstInvalid = null;" +
          "var valid = true;" +
          "for (var i = 0; i < requiredFields.length; i++) {" +
          "var field = requiredFields[i];" +
          "var isEmpty = !field.value.trim();" +
          "if (field.type === 'checkbox') isEmpty = !field.checked;" +
          "if (isEmpty) {" +
          "valid = false;" +
          "field.classList.add('is-invalid');" +
          "var pField = field.closest('.p-field');" +
          "if (pField) pField.classList.add('is-invalid');" +
          "if (field.nextSibling && field.nextSibling.classList) field.nextSibling.classList.add('is-invalid');" +
          "if (!firstInvalid) firstInvalid = field;" +
          "} else {" +
          "field.classList.remove('is-invalid');" +
          "var pField = field.closest('.p-field');" +
          "if (pField) pField.classList.remove('is-invalid');" +
          "if (field.nextSibling && field.nextSibling.classList) field.nextSibling.classList.remove('is-invalid');" +
          "}" +
          "}" +
          "if (firstInvalid) {" +
          "var target = (firstInvalid.offsetParent === null && firstInvalid.nextSibling) ? firstInvalid.nextSibling : firstInvalid;" +
          "if (typeof target.focus === 'function') target.focus();" +
          "target.scrollIntoView({ behavior: 'smooth', block: 'center' });" +
          "}" +
          "return { valid: valid };" +
          "};" +
          "window.getFilledHTML = function() {" +
          "var clone = document.documentElement.cloneNode(true);" +
          "var doc = document;" +
          "var inputs = clone.querySelectorAll('input, textarea, select');" +
          "var origInputs = doc.querySelectorAll('input, textarea, select');" +
          "inputs.forEach(function(inp, idx) {" +
          "var orig = origInputs[idx];" +
          "if (!orig) return;" +
          // Skip hidden fields, file inputs, and internal preview elements
          "if (orig.type === 'file' || orig.id === 'preview-upload' || window.getComputedStyle(orig).display === 'none') {" +
          "inp.parentNode.removeChild(inp);" +
          "return;" +
          "}" +
          "var val = '';" +
          "if (inp.tagName === 'SELECT') { val = orig.options[orig.selectedIndex]?.text || ''; }" +
          "else if (inp.type === 'checkbox' || inp.type === 'radio') {" +
          "val = orig.checked ? '☑' : '☐';" +
          "var span = document.createElement('span');" +
          "span.textContent = val + ' ';" +
          "span.style.fontSize = '18px';" +
          "inp.parentNode.replaceChild(span, inp);" +
          "return;" +
          "}" +
          "else { val = orig.value; }" +
          "var span = document.createElement('span');" +
          "span.textContent = val || '_________';" +
          "span.style.fontWeight = 'bold';" +
          "span.style.padding = '0 2px';" +
          "if (inp.tagName === 'TEXTAREA') { span.style.display = 'block'; span.style.whiteSpace = 'pre-wrap'; }" +
          "inp.parentNode.replaceChild(span, inp);" +
          "});" +
          "var sigCanvases = doc.querySelectorAll('.p-sig-box canvas, canvas.p-signature-pad, canvas');" +
          "var cloneCanvases = clone.querySelectorAll('.p-sig-box canvas, canvas.p-signature-pad, canvas');" +
          "sigCanvases.forEach(function(canv, idx) {" +
          "try {" +
          "var target = cloneCanvases[idx];" +
          "if (target) {" +
          "var tempCanvas = document.createElement('canvas');" +
          "tempCanvas.width = canv.width; tempCanvas.height = canv.height;" +
          "var tCtx = tempCanvas.getContext('2d');" +
          "tCtx.fillStyle = '#ffffff';" +
          "tCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);" +
          "tCtx.drawImage(canv, 0, 0);" +
          "var dataUrl = tempCanvas.toDataURL('image/jpeg', 0.9);" +
          "var finalImg = document.createElement('img');" +
          "finalImg.src = dataUrl;" +
          "finalImg.style.maxWidth = '250px';" +
          "finalImg.style.maxHeight = '100px';" +
          "finalImg.style.display = 'block';" +
          "target.parentNode.replaceChild(finalImg, target);" +
          "}" +
          "} catch(e) { console.error(e); }" +
          "});" +
          "var scripts = clone.querySelectorAll('script');" +
          "for(var s=0; s<scripts.length; s++) { scripts[s].parentNode.removeChild(scripts[s]); }" +
          "return clone.outerHTML;" +
          "};";
        iframe.contentDocument.body.appendChild(script);
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [template, visible]);

  async function handleSubmit() {
    if (!template || !agreed) return

    let filledHTML = null;

    // Reach into iframe to trigger native validation & extract data
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
        
        // Extract filled HTML
        if (typeof win.getFilledHTML === 'function') {
          filledHTML = win.getFilledHTML();
        }
      }
      // Fallback: Check if there's any required field manually
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

    if (!agreed) {
      setError('Please check the consent checkbox before proceeding.')
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      const res = await submitAgreementSign({ 
          agreement_template_id: template.id,
          content_html: filledHTML
      })
      if (res?.status) {
        setSuccess(true)
        setCredentials({
          token: useAuthStore.getState().token,
          user: { ...user, is_agreement_signed: true },
          rememberMe: useAuthStore.getState().rememberMe
        })
      } else {
        setError(res?.message || 'Failed to submit agreement.')
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'An error occurred.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading && visible) return <AgreementSignModalLoader />

  if (!visible || !template) return null

  return (
    <>
      <div className="asm-overlay" />
      <div className="asm-main-wrapper" role="dialog" aria-modal="true">
        <div className="asm-modal-card">
          <div className="asm-side-info">
            <div className="asm-brand-area">
              <div className="asm-brand-icon">
                <i className="ri-shield-keyhole-fill" />
              </div>
              <div className="asm-brand-name">Four Corner Funding</div>
            </div>

            <div className="asm-step-box">
              <div className="asm-step-num">Compliance Protocol</div>
              <h2 className="asm-step-title">Platform Security & Verification</h2>
              <p className="asm-step-desc">
                Welcome to <strong>Four Corner Funding</strong>. To ensure a compliant and secure environment for all financial operations, we require every partner to certify they have reviewed our cooperation agreement.
              </p>
            </div>

            <div className="asm-legal-list">
              <div className="asm-legal-item">
                <div className="asm-legal-icon"><i className="ri-database-2-line" /></div>
                <div>
                  <div className="asm-legal-text-term">Data Privacy</div>
                  <div className="asm-legal-text-desc">Encryption standards protect all sensitive transaction data.</div>
                </div>
              </div>
              <div className="asm-legal-item">
                <div className="asm-legal-icon"><i className="ri-file-shield-2-line" /></div>
                <div>
                  <div className="asm-legal-text-term">Financial Integrity</div>
                  <div className="asm-legal-text-desc">Adherence to AML and global KYC verification standards.</div>
                </div>
              </div>
              <div className="asm-legal-item">
                <div className="asm-legal-icon"><i className="ri-quill-pen-line" /></div>
                <div>
                  <div className="asm-legal-text-term">Legally Binding</div>
                  <div className="asm-legal-text-desc">This signature constitutes a valid digital contract.</div>
                </div>
              </div>
            </div>

            <div className="asm-side-footer">
              Copyright © {new Date().getFullYear()} Four Corner Funding. All rights reserved.
            </div>
          </div>

          <div className="asm-content-area">
            <div className="asm-content-header">
              <div className="asm-content-title">Agreement Signing</div>
              <div className="asm-header-meta">MANDATORY ACTION</div>
            </div>

            {success ? (
              <div className="asm-success-screen">
                <div className="asm-success-icon-wrapper">
                  <i className="ri-checkbox-circle-fill" />
                </div>
                <h2 className="asm-success-title">Thank You!</h2>
                <p className="asm-success-desc">
                  Your agreement has been successfully signed. You now have full access to all platform features.
                </p>
                <button
                  className="asm-btn-proceed"
                  onClick={() => setVisible(false)}
                >
                  Proceed to Dashboard
                  <i className="ri-arrow-right-line" />
                </button>
              </div>
            ) : (
              <>
                <div className="asm-document-frame">
                  <iframe
                    ref={iframeRef}
                    className="asm-iframe"
                    title="Agreement Content"
                    srcDoc={template.template_html}
                  />
                </div>

                <div className="asm-action-footer">
                  <div className="asm-action-flex">
                    <label className="asm-checkbox-container">
                      <input
                        type="checkbox"
                        className="asm-hidden-checkbox"
                        checked={agreed}
                        onChange={(e) => setAgreed(e.target.checked)}
                        disabled={submitting || success}
                      />
                      <div className="asm-custom-checkbox" style={agreed ? { background: APP_PRIMARY, borderColor: APP_PRIMARY } : {}}>
                        {agreed && <i className="ri-check-line" style={{ color: '#fff', fontSize: '14px' }} />}
                      </div>
                      <span className="asm-checkbox-label">
                        I have reviewed and agree to the terms of this agreement.
                      </span>
                    </label>

                    <div className="asm-button-groups">
                      <button
                        onClick={handleSubmit}
                        disabled={!agreed || submitting}
                        className={`asm-btn asm-btn-submit ${( !agreed || submitting) ? 'asm-btn-disabled' : ''}`}
                      >
                        {submitting ? (
                          <><span className="asm-spinner" /> Processing...</>
                        ) : (
                          <><i className="ri-quill-pen-line" /> Accept & Continue</>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

