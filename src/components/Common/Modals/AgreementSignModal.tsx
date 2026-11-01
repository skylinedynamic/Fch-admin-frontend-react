import React, { useEffect, useState, useCallback } from 'react'
import { checkAgreementSign, submitAgreementSign } from '../../../modules/agreement/services'
import { useAuthStore } from '../../../store/auth/authStore'
import "../../../../assets/css/agreement-builder.css"
import { AgreementSignModalLoader } from '../../Loader/AgreementLoader'
import { useGuidedSigning } from './useGuidedSigning'
import SignatureDialog from './SignatureDialog'
import { withAppCalendar } from '../../../utils/agreementCalendar'
import { collectAgreementFields, type AgreementFieldValues } from '../../../utils/agreementFields'

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
  /** The wording's version; sent back on submit so a wording changed meanwhile is not signed unseen. */
  version_id?: number
  version?: number
}

declare global {
  interface Window {
    validateDoc?: () => { valid: boolean }
    getFilledHTML?: () => string
    extractFieldValues?: () => Record<string, any>
  }
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

  const loadTemplate = useCallback(async (isCancelled: () => boolean = () => false) => {
    // No need to call check API if user is already signed according to their session
    if (useAuthStore.getState().user?.is_agreement_signed) return;

    try {
      const res = await checkAgreementSign()
      if (!isCancelled() && res?.status && res.data?.needs_sign && res.data?.template) {
        setTemplate(res.data.template)
        setVisible(true)
      }
    } catch (err) { } finally {
      if (!isCancelled()) setLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    loadTemplate(() => cancelled)
    return () => { cancelled = true }
  }, [loadTemplate])

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

  // Guided signing: fields left, "Next field", the date signed and an adopted signature.
  const guide = useGuidedSigning(iframeRef, template ? `${template.id}:${template.version_id}:${template.template_html.length}` : null)
  const signerName = (user as any)?.name || [(user as any)?.first_name, (user as any)?.last_name].filter(Boolean).join(' ')

  async function handleSubmit() {
    if (!template || !agreed) return

    let filledHTML: string | null = null;
    let fieldValues: Record<string, any> = {};
    let fields: AgreementFieldValues = {};

    const iframe = iframeRef.current
    // Read before getFilledHTML(), which re-lays the page out on phones.
    if (iframe?.contentDocument) {
      fields = collectAgreementFields(iframe.contentDocument)
    }
    if (iframe && (iframe.contentWindow || iframe.contentDocument)) {
      const win = iframe.contentWindow as any
      if (win && typeof win.validateDoc === 'function') {
        const result = win.validateDoc()
        if (!result.valid) {
          setError('Mandatory fields missing: Please complete all highlighted fields in the document.')
          setSubmitting(false)
          return
        }

        if (typeof win.getFilledHTML === 'function') {
          filledHTML = win.getFilledHTML();
        }

        if (typeof win.extractFieldValues === 'function') {
          fieldValues = win.extractFieldValues();
        }
      }
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
        agreement_template_version_id: template.version_id,
        // The server builds the signed record from these. content_html/field_values are only for an API not yet updated.
        fields,
        content_html: filledHTML,
        field_values: fieldValues,
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
      if (err?.response?.status === 409) {
        // The wording changed after it was opened: show the current wording to review.
        setAgreed(false)
        loadTemplate()
      }
    } finally {
      setSubmitting(false)
    }
  }

  const iframeContent = React.useMemo(() => {
    if (!template) return '';
    let html = template.template_html;
    
    const styleOverride = `
      <style id="force-premium-css">
        .is-invalid { border-color: #F06548 !important; background-color: #fff5f5 !important;box-shadow: none !important; animation: asm-shake 0.3s ease-in-out; }
        .p-field.is-invalid { background-color: #FFF5F5 !important; border-radius: 12px; padding: 10px !important; }
        .p-field.is-invalid .p-sig-box { border: none !important; background: transparent !important; }
        .p-error { display: none !important; }
        @keyframes asm-shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-3px); } 75% { transform: translateX(3px); } }
        
        .p-parties-grid, .p-sig-grid { display: flex !important; flex-wrap: wrap !important; }
        
        @media (max-width: 793px) {
          html, body, .ab4-root { height: auto !important; min-height: auto !important; }
          body { padding: 8px !important; background: #fff !important; margin: 0 !important; }
          .page-sep { display: none !important; }
          .doc { 
            width: 100% !important; 
            height: auto !important; 
            min-height: auto !important; 
            padding: 15px !important; 
            box-shadow: none !important; 
            overflow: visible !important; 
          }
          .p-parties-grid, .p-sig-grid { display: block !important; }
          .ab4-parties, .ab4-sig {
            display: grid !important;
            grid-template-columns: 1fr !important;
            gap: 16px !important;
          }
           .p-logo-img { max-width: 100% !important; }
           .p-party-col, .ab4-party { height: auto !important; }
           .ab4-field, .p-field, .p-input-wrap, .p-date-wrapper {
             flex-direction: column !important;
             align-items: stretch !important;
           }
           .ab4-finp, .ab4-fta, .ab4-sig-input, .ab4-val-text,
           .ab4-field strong, .ab4-field b, .ab4-field-val,
           .ab4-field-val strong, .ab4-field-val b,
           .p-input-wrap span, .p-sig-box span,
           .p-input, .p-textarea, .p-date-wrapper input {
             width: 100% !important;
             min-width: 100% !important;
             display: block !important;
           }
           .col-md-6 { width: 100% !important; margin-bottom: 12px !important; }
           .col-md-6:last-child { margin-bottom: 0 !important; }
         }

        /* Force desktop view for pagination right before submission */
        html.force-desktop, html.force-desktop body {
          width: 794px !important;
          padding: 0 !important;
          margin: 0 !important;
          background: #e8edf5 !important;
        }
        html.force-desktop .page-sep {
          display: flex !important;
        }
        html.force-desktop .doc { 
          width: 794px !important; 
          height: 1122.5px !important; 
          min-height: 1122.5px !important; 
          padding: var(--doc-pad-top) var(--doc-pad-sides) var(--doc-pad-bot) !important; 
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1) !important; 
          overflow: hidden !important; 
        }
        html.force-desktop .p-parties-grid, html.force-desktop .p-sig-grid {
          display: flex !important;
        }
        html.force-desktop .ab4-parties, html.force-desktop .ab4-sig {
          display: grid !important;
          grid-template-columns: 1fr 1fr !important;
        }
        html.force-desktop .p-party-col, html.force-desktop .ab4-party {
          height: 100% !important;
        }
        html.force-desktop .col-md-6 {
          width: 50% !important;
          margin-bottom: 0 !important;
        }
      </style>
    `;

    const scriptOverride = `
      <script>
        window.validateDoc = function() {
          var form = document.querySelector('form') || document.body;
          var requiredFields = form.querySelectorAll('input[required], textarea[required], select[required]');
          var firstInvalid = null;
          var valid = true;
          for (var i = 0; i < requiredFields.length; i++) {
            var field = requiredFields[i];
            var isEmpty = !field.value.trim();
            if (field.type === 'checkbox') isEmpty = !field.checked;
            if (isEmpty) {
              valid = false;
              field.classList.add('is-invalid');
              var pField = field.closest('.p-field');
              if (pField) pField.classList.add('is-invalid');
              if (field.nextSibling && field.nextSibling.classList) field.nextSibling.classList.add('is-invalid');
              if (!firstInvalid) firstInvalid = field;
            } else {
              field.classList.remove('is-invalid');
              var pField = field.closest('.p-field');
              if (pField) pField.classList.remove('is-invalid');
              if (field.nextSibling && field.nextSibling.classList) field.nextSibling.classList.remove('is-invalid');
            }
          }
          if (firstInvalid) {
            if (typeof firstInvalid.focus === 'function') { try { firstInvalid.focus(); } catch(e) {} }
            var target = firstInvalid.closest('.p-field') || firstInvalid;
            target.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
          return { valid: valid };
        };

        window.getFilledHTML = function() {
          // 1. Sync all active DOM input values to attributes BEFORE paginating/cloning
          var sourceInputs = document.querySelectorAll('input, textarea, select');
          sourceInputs.forEach(function(inp) {
            if (inp.type === 'checkbox' || inp.type === 'radio') {
              if (inp.checked) {
                inp.setAttribute('checked', 'checked');
              } else {
                inp.removeAttribute('checked');
              }
            } else if (inp.tagName === 'SELECT') {
              for (var o = 0; o < inp.options.length; o++) {
                if (o === inp.selectedIndex) {
                  inp.options[o].setAttribute('selected', 'selected');
                } else {
                  inp.options[o].removeAttribute('selected');
                }
              }
            } else {
              inp.setAttribute('value', inp.value);
              if (inp.tagName === 'TEXTAREA') {
                inp.innerHTML = inp.value;
              }
            }
          });

          // 2. Convert active DOM canvases to static images BEFORE paginating/cloning
          var sigCanvases = document.querySelectorAll('.p-sig-box canvas, canvas.p-signature-pad, canvas');
          sigCanvases.forEach(function(canv) {
            try {
              var tempCanvas = document.createElement('canvas');
              tempCanvas.width = canv.width; tempCanvas.height = canv.height;
              var tCtx = tempCanvas.getContext('2d');
              tCtx.fillStyle = '#ffffff';
              tCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
              tCtx.drawImage(canv, 0, 0);
              var dataUrl = tempCanvas.toDataURL('image/jpeg', 0.9);
              var finalImg = document.createElement('img');
              finalImg.src = dataUrl;
              finalImg.style.maxWidth = '250px';
              finalImg.style.maxHeight = '100px';
              finalImg.style.display = 'block';
              canv.parentNode.replaceChild(finalImg, canv);
            } catch(e) { console.error(e); }
          });

          // 3. Handle mobile viewport rendering/pagination
          var isMobile = window.innerWidth < 794;
          if (isMobile && typeof window.paginate === 'function') {
            document.documentElement.classList.add('force-desktop');
            try {
              Object.defineProperty(window, 'innerWidth', { value: 800, configurable: true });
            } catch(e) {}
            window.paginate();
          }

          // 4. Now clone the fully-rendered and paginated document
          var clone = document.documentElement.cloneNode(true);

          // 5. Restore mobile layout on screen so user has no layout break
          if (isMobile && typeof window.paginate === 'function') {
            document.documentElement.classList.remove('force-desktop');
            try {
              delete window.innerWidth;
            } catch(e) {}
            window.paginate();
          }

          // 6. Clean up the cloned document element
          clone.classList.remove('force-desktop');
          var cloneInputs = clone.querySelectorAll('input, textarea, select');
          cloneInputs.forEach(function(inp) {
            if (inp.type === 'file' || inp.id === 'preview-upload' || window.getComputedStyle(inp).display === 'none' || (inp.classList.contains('p-input') && inp.closest('.preview-dropzone'))) {
              inp.parentNode.removeChild(inp);
              return;
            }
            var val = '';
            if (inp.tagName === 'SELECT') {
              val = inp.options[inp.selectedIndex]?.text || '';
            } else if (inp.type === 'checkbox' || inp.type === 'radio') {
              val = inp.checked || inp.hasAttribute('checked') ? '☑' : '☐';
              var span = document.createElement('span');
              span.textContent = val + ' ';
              span.style.fontSize = '18px';
              inp.parentNode.replaceChild(span, inp);
              return;
            } else {
              val = inp.value || inp.getAttribute('value') || '';
            }
            var span = document.createElement('span');
            span.textContent = val || '_________';
            span.style.padding = '0 2px';
            if (inp.tagName === 'TEXTAREA') {
              span.style.display = 'block';
              span.style.whiteSpace = 'pre-wrap';
            }
            inp.parentNode.replaceChild(span, inp);
          });

          var scripts = clone.querySelectorAll('script');
          for (var s = 0; s < scripts.length; s++) {
            scripts[s].parentNode.removeChild(scripts[s]);
          }
          return clone.outerHTML;
        };

        function attachDropzone() {
          if (window.__dzAttached) return;
          window.__dzAttached = true;
          document.addEventListener('click', function(e) {
            var dropzone = e.target.closest('.preview-dropzone');
            if (dropzone) {
              var blockId = dropzone.getAttribute('data-block-id');
              if (blockId && window.parent && typeof window.parent.__openFmForBlock === 'function') {
                window.parent.__openFmForBlock(blockId);
                return;
              }
              var upld = document.getElementById('preview-upload');
              if (!upld) {
                upld = document.createElement('input');
                upld.type = 'file';
                upld.id = 'preview-upload';
                upld.style.display = 'none';
                upld.accept = 'image/*';
                document.body.appendChild(upld);
              }
              upld.click();
              upld.onchange = function(ev) {
                var file = ev.target.files[0];
                if (file) {
                  var r = new FileReader();
                  r.onload = function(rev) {
                    var input = dropzone.querySelector('input');
                    if (!input) {
                      input = document.createElement('input');
                      input.type = 'text';
                      input.className = 'p-input';
                      input.style.position = 'absolute';
                      input.style.left = '0'; input.style.top = '0'; input.style.width = '0'; input.style.height = '0'; input.style.opacity = '0'; input.style.pointerEvents = 'none';
                      dropzone.appendChild(input);
                    }
                    input.value = rev.target.result;
                    var child = dropzone.firstChild;
                    while (child) {
                      var next = child.nextSibling;
                      if (child !== input) { dropzone.removeChild(child); }
                      child = next;
                    }
                    var img = document.createElement('img');
                    img.src = rev.target.result;
                    img.style.maxHeight = '100%';
                    img.style.maxWidth = '100%';
                    img.style.borderRadius = '4px';
                    dropzone.insertBefore(img, input);
                    dropzone.style.border = 'none';
                    dropzone.style.background = 'transparent';
                    dropzone.style.padding = '0';
                    var event = document.createEvent('HTMLEvents');
                    event.initEvent('change', true, false);
                    input.dispatchEvent(event);
                  };
                  r.readAsDataURL(file);
                }
              };
            }
          });
        }
        attachDropzone();
      </script>
    `;

    if (html.toLowerCase().includes('</head>')) {
      html = html.replace(/<\/head>/i, styleOverride + '</head>');
    } else {
      html = styleOverride + html;
    }

    if (html.toLowerCase().includes('</body>')) {
      html = html.replace(/<\/body>/i, scriptOverride + '</body>');
    } else {
      html = html + scriptOverride;
    }

    // Its date fields open the app's own calendar.
    return withAppCalendar(html);
  }, [template]);

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
                  className="btn btn-primary btn-lg asm-btn-proceed"
                  onClick={() => setVisible(false)}
                >
                  Proceed to Dashboard
                  <i className="ri-arrow-right-line" />
                </button>
              </div>
            ) : (
              <>
                {guide.total > 0 && (
                  <div className="asm-guide" aria-live="polite">
                    <div className="asm-guide__status">
                      <span className="asm-guide__icon" aria-hidden="true">
                        <i className={guide.done === guide.total ? 'ri-checkbox-circle-fill' : 'ri-edit-circle-line'} />
                      </span>
                      <div>
                        <div className="asm-guide__count"><strong>{guide.done} of {guide.total}</strong> required fields completed</div>
                        <div className="asm-guide__bar"><span style={{ width: `${Math.round((guide.done / guide.total) * 100)}%` }} /></div>
                      </div>
                    </div>
                    {guide.done < guide.total ? (
                      <button type="button" className="btn btn-primary asm-guide__next" onClick={guide.next}>
                        {guide.started ? 'Next field' : 'Start'}
                        <i className="ri-arrow-down-line" aria-hidden="true" />
                      </button>
                    ) : (
                      <span className="asm-guide__ready"><i className="ri-check-line" aria-hidden="true" /> Ready to sign</span>
                    )}
                  </div>
                )}

                <div className="asm-document-frame">
                  <iframe
                    ref={iframeRef}
                    className="asm-iframe"
                    title="Agreement Content"
                    srcDoc={iframeContent}
                    onLoad={guide.onFrameLoad}
                  />
                </div>

                {guide.signingBlock && (
                  <SignatureDialog name={signerName} onApply={guide.applySignature} onClose={guide.closeSignature} />
                )}

                <div className="asm-action-footer">
                  {error && (
                    <div className="alert alert-danger py-2 px-3 mb-2 fs-13" role="alert">
                      {error}
                    </div>
                  )}
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
                        className={`btn btn-primary asm-btn-submit ${(!agreed || submitting) ? 'asm-btn-disabled' : ''}`}
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

