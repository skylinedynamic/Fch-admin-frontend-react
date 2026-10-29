import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchSignedAgreementHtml, cancelAgreementSign } from '../../modules/agreement/services';
import { toast } from 'react-toastify';
import ConfirmationModal from '../../components/Common/Modals/ConfirmationModal';
import { AGREEMENT_VIEW_TEXT } from '../../config/agreementView';
import builderCss from "../../../assets/css/agreement-builder.css?raw";
import "../../../assets/css/agreement-builder.css";

const DownloadAgreement = () => {
    const { userId } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    // 'ready' (the signed copy), 'not_signed', 'missing' (marked signed, no
    // copy - BUG-106) or 'resigned' (Re-sign done).
    const [view, setView] = useState('ready');
    const [showResign, setShowResign] = useState(false);
    const [resigning, setResigning] = useState(false);
    const iframeRef = useRef(null);

    useEffect(() => {
        if (!userId) {
            navigate('/not-found');
            return;
        }

        fetchSignedAgreementHtml(userId)
            .then(res => {
                let html = res?.data?.content_html;
                if (!html) {
                    // No signed copy: say so rather than a 404 page (BUG-106).
                    const missing = !!res?.data?.has_sign;
                    setView(missing ? 'missing' : 'not_signed');
                    setShowResign(missing);
                    return;
                }

                const isMobile = window.innerWidth < 794;
                const styleOverride = `
                <style>
                    /* Specificity: Target signature/date containers to remove card styling */
                    .ab4-sig, .ab4-sig-col, .ab4-sig-col--drop, .ab4-sig-col--date { 
                        background: transparent !important; 
                        border: none !important; 
                        box-shadow: none !important; 
                    }
                    .ab4-sig-col--drop img { width: 150px !important; mix-blend-mode: multiply !important; max-height: none !important; }
                    .ab4-sig-meta { border-top: 1px solid #333 !important; }
                    
                    /* Typography: Label and Value to 12px, light border bottom */
                    .ab4-field-lbl, .p-label { font-size: 12px !important; font-weight: 400 !important; color: #000000ff !important; }
                    
                    /* Target all input/textarea field types directly */
                    .ab4-finp, .ab4-fta, .ab4-sig-input,
                    .ab4-val-text { 
                        font-size: 12px !important; 
                        font-weight: 400 !important; 
                        color: #000 !important; 
                        border-bottom: 1px solid #e2e8f0 !important;
                        border-top: none !important;
                        border-left: none !important;
                        border-right: none !important;
                        display: inline-block !important;
                        width: 50% !important;
                    }
                    /* Also target bold/strong inside field value area */
                    .ab4-field strong, .ab4-field b,
                    .ab4-field-val, .ab4-field-val strong, .ab4-field-val b {
                        font-size: 13px !important;
                        font-weight: 400 !important;
                        color: #000 !important;
                        border-bottom: 1px solid #e2e8f0 !important;
                        display: inline-block !important;
                        width: 50% !important;
                    }
                    /* p-input-wrap span styling */
                    .p-input-wrap span {
                        font-size: 13px !important;
                        border-bottom: 1px solid #ddd !important;
                        min-width: 50% !important;
                        display: inline-block !important;
                    }
                        .p-input-wrap{
                            margin-bottom:5px !important;
                        }
                    .p-sig-box{
                        border: none!important;
                    }
                    .p-sig-meta{
                        margin-top: 5px!important;
                    }    
                    .p-sig-meta{
                        color: #333435ff !important;
                    }  
                        
                    .p-sig-box span{
                        font-size: 13px !important;
                        font-weight: 500 !important;
                        border-bottom: 1px solid #ddd !important;
                        min-width: 50% !important;
                        display: inline-block !important;
                        text-align: center !important;
                    }
                    
                    /* Reset .p-field margins and configure field flex layout */
                    .p-field { margin-bottom: 0 !important; }
                    .ab4-field { 
                        display: flex !important; 
                        align-items: baseline !important; 
                        gap: 8px !important; 
                        margin-bottom: 8px !important;
                    }
                    
                    /* Height and Min-Height adjustments as requested */
                    .ab4-doc, .ab4-root, html, body { 
                        height: 100% !important; 
                        min-height: 0 !important; 
                    }

                    /* General page breaks and layout spacing */
                    .page-break, .page-sep { display: block; height: 15px; background: #35434d; }
                    @media print { .page-break { display: none; page-break-before: always; } }

                    /* Responsive styles inside the iframe */
                    ${isMobile ? `
                        html, body, .ab4-root {
                            height: auto !important;
                            min-height: auto !important;
                        }
                        body {
                            padding: 10px !important;
                            margin: 0 !important;
                            background: #fff !important;
                        }
                        .ab4-doc, .doc {
                            width: 100% !important;
                            max-width: 100% !important;
                            height: auto !important;
                            min-height: auto !important;
                            padding: 15px !important;
                            box-shadow: none !important;
                            overflow: visible !important;
                        }
                        .page-sep, .page-break {
                            display: none !important;
                        }
                        .p-parties-grid, .p-sig-grid {
                            display: block !important;
                        }
                        .ab4-parties, .ab4-sig {
                            display: grid !important;
                            grid-template-columns: 1fr !important;
                            gap: 16px !important;
                        }
                        .p-party-col, .ab4-party {
                            height: auto !important;
                        }
                        .col-md-6 {
                            width: 100% !important;
                            margin-bottom: 12px !important;
                        }
                        .col-md-6:last-child {
                            margin-bottom: 0 !important;
                        }
                        img {
                            max-width: 100% !important;
                        }
                        .ab4-field, .p-field, .p-input-wrap, .p-date-wrapper {
                            flex-direction: column !important;
                            align-items: stretch !important;
                        }
                        .ab4-finp, .ab4-fta, .ab4-sig-input, .ab4-val-text,
                        .ab4-field strong, .ab4-field b, .ab4-field-val,
                        .ab4-field-val strong, .ab4-field-val b,
                        .p-input-wrap span, .p-sig-box span {
                            width: 100% !important;
                            min-width: 100% !important;
                            display: block !important;
                        }
                    ` : ''}
                </style>
                <script>
                    (function() {
                        // 1. Remove asterisks from labels
                        document.querySelectorAll('.ab4-field-lbl').forEach(el => {
                            el.textContent = el.textContent.replace('*', '').trim();
                        });

                        // 2. Transform inputs to bold text spans (excluding file inputs for fakepath issue)
                        document.querySelectorAll('input:not([type="file"]):not([type="hidden"]):not([type="submit"]), textarea, select').forEach(el => {
                            const span = document.createElement('span');
                            const cleanClass = (el.className || '').replace(/\bis-invalid\b/g, '').trim();
                            span.className = cleanClass + ' ab4-val-text';
                            span.textContent = el.value || el.getAttribute('value') || '';
                            el.parentNode.replaceChild(span, el);
                        });

                        // 3. Hide file inputs and buttons for static view
                        document.querySelectorAll('input[type="file"], input[type="submit"], input[type="button"], button:not(.da-print-btn)').forEach(el => {
                            el.style.display = 'none';
                        });

                        // 4. Clear styling for sig/date boxes
                        document.querySelectorAll('.ab4-sig-col, .ab4-sig-col--date').forEach(el => {
                            el.style.setProperty('border', 'none', 'important');
                            el.style.setProperty('background', 'transparent', 'important');
                            el.style.setProperty('box-shadow', 'none', 'important');
                        });

                        // 5. Remove any remaining is-invalid classes
                        document.querySelectorAll('.is-invalid').forEach(el => {
                            el.classList.remove('is-invalid');
                        });
                    })();
                </script>
                `;

                // Try to inject before body close or just append
                if (html.toLowerCase().includes('</body>')) {
                    html = html.replace(/<\/body>/i, styleOverride + '</body>');
                } else {
                    html += styleOverride;
                }

                const doc = iframeRef.current?.contentDocument;
                if (!doc) return;

                doc.open();
                doc.write(html);
                doc.close();

                // Expand iframe to full content height (retry for fonts/images)
                [300, 800, 2000].forEach(ms =>
                    setTimeout(() => {
                        if (doc.body && iframeRef.current)
                            iframeRef.current.style.height = doc.body.scrollHeight + 'px';
                    }, ms)
                );
            })
            .catch(e => {
                navigate('/not-found');
            })
            .finally(() => setLoading(false));
    }, [userId, navigate]);

    const handlePrint = () => {
        iframeRef.current?.contentWindow?.print();
    };

    const handleResign = async () => {
        setResigning(true);
        try {
            await cancelAgreementSign(userId);
            setShowResign(false);
            setView('resigned');
        } catch (err) {
            if (err?.response?.status !== 403) {
                toast.error(err?.response?.data?.message || 'Failed to clear the signed status');
            }
        } finally {
            setResigning(false);
        }
    };

    const notice = {
        not_signed: { icon: 'ri-file-forbid-line', title: AGREEMENT_VIEW_TEXT.notSignedTitle, body: AGREEMENT_VIEW_TEXT.notSignedBody },
        missing: { icon: 'ri-file-warning-line', title: AGREEMENT_VIEW_TEXT.missingTitle, body: AGREEMENT_VIEW_TEXT.missingBody },
        resigned: { icon: 'ri-checkbox-circle-line', title: AGREEMENT_VIEW_TEXT.resignDoneTitle, body: AGREEMENT_VIEW_TEXT.resignDoneBody },
    }[view];

    return (
        <div className="da-page">
            <style>{`
                .da-loading {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(255, 255, 255, 0.9);
                    backdrop-filter: blur(5px);
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    z-index: 9999;
                }
                .da-loading-spinner {
                    width: 3rem;
                    height: 3rem;
                    border-width: 0.25em;
                }
                .da-loading-text {
                    margin-top: 20px;
                    font-weight: 600;
                    color: #4f46e5;
                    font-size: 14px;
                    letter-spacing: 0.1em;
                    text-transform: uppercase;
                }

                /* Responsive Toolbar & Sheet overrides on mobile */
                @media (max-width: 793px) {
                    .da-toolbar {
                        padding: 12px 16px !important;
                        flex-direction: column !important;
                        gap: 10px !important;
                        align-items: stretch !important;
                        text-align: center !important;
                    }
                    .da-toolbar-brand {
                        justify-content: center !important;
                    }
                    .da-print-btn {
                        width: 100% !important;
                        justify-content: center !important;
                    }
                    .da-body {
                        padding: 10px !important;
                    }
                    .da-sheet {
                        width: 100% !important;
                        max-width: 100% !important;
                        margin: 0 !important;
                        box-shadow: none !important;
                        border-radius: 0 !important;
                    }
                }
            `}</style>

            {loading && (
                <div className="da-loading">
                    <div className="spinner-border text-primary da-loading-spinner" role="status" />
                    <div className="da-loading-text">Preparing Agreement...</div>
                </div>
            )}

            {notice ? (
                <div className="da-body">
                    <div className="card border shadow-none mx-auto mt-5 text-center" style={{ maxWidth: 520 }}>
                        <div className="card-body p-4">
                            <i className={`${notice.icon} display-5 text-muted`} />
                            <h5 className="fw-semibold mt-3 mb-2">{notice.title}</h5>
                            <p className="text-muted mb-0">{notice.body}</p>
                            {view === 'missing' && (
                                <button type="button" className="btn btn-primary mt-3" onClick={() => setShowResign(true)}>
                                    {AGREEMENT_VIEW_TEXT.resignButton}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                <>
                    <div className="da-toolbar" style={loading ? { visibility: 'hidden' } : {}}>
                        <div className="da-toolbar-brand">
                            <i className="ri-shield-check-fill" />
                            <span>VERIFIED AGREEMENT</span>
                        </div>
                        <button className="da-print-btn" onClick={handlePrint}>
                            <i className="ri-download-cloud-2-fill" />
                            Print or Download PDF
                        </button>
                    </div>

                    <div className="da-body">
                        <div className="da-sheet">
                            <iframe ref={iframeRef} title="Agreement" scrolling="no" className="da-iframe" />
                        </div>
                    </div>
                </>
            )}

            {/* Always mounted: unmounting mid-hide breaks Bootstrap's transition. */}
            <ConfirmationModal
                show={showResign}
                onHide={() => setShowResign(false)}
                onConfirm={handleResign}
                loading={resigning}
                title={AGREEMENT_VIEW_TEXT.missingTitle}
                message={AGREEMENT_VIEW_TEXT.missingBody}
                confirmText={AGREEMENT_VIEW_TEXT.resignButton}
            />

        </div>
    );
};

export default DownloadAgreement;
