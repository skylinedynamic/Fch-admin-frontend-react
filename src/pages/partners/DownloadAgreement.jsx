import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchSignedAgreementHtml } from '../../modules/agreement/services';
import { toast } from 'react-toastify';
import builderCss from '../../../assets/css/agreement-builder.css?raw';
import '../../../assets/css/agreement-builder.css';

const DownloadAgreement = () => {
    const { userId } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
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
                    navigate('/not-found');
                    return; 
                }

                // NUCLEAR FIXES: This handles everything by injecting at the very end of the document
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
                    
                    /* Typography: Reduce label to 12px, Value to 13px */
                    .ab4-field-lbl, .ab4-val-text { 
                        font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", "Noto Sans", "Liberation Sans", Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji" !important;
                    }
                    .ab4-field-lbl { font-size: 12px !important; font-weight: 500 !important; color: #64748b !important; }
                    .ab4-val-text { 
                        font-size: 12px !important; 
                        font-weight: 600 !important; 
                        color: #000 !important; 
                        border: none !important; /* REMOVE UNDERLINE */
                        display: inline-block !important;
                    }
                    
                    /* Reset .p-field margins and configure field flex layout */
                    .p-field { margin-bottom: 0 !important; }
                    .ab4-field { 
                        display: flex !important; 
                        align-items: baseline !important; 
                        gap: 8px !important; 
                        margin-bottom: 8px !important;
                    }
                    
                    /* General page breaks and layout spacing */
                    .page-break, .page-sep { display: block; height: 15px; background: #35434d; }
                    @media print { .page-break { display: none; page-break-before: always; } }
                </style>
                <script>
                    (function() {
                        // 1. Remove asterisks from labels
                        document.querySelectorAll('.ab4-field-lbl').forEach(el => {
                            el.textContent = el.textContent.replace('*', '').trim();
                        });

                        // 2. Transform inputs to bold text spans
                        document.querySelectorAll('input, textarea, select').forEach(el => {
                            const span = document.createElement('span');
                            span.className = (el.className || '') + ' ab4-val-text';
                            span.textContent = el.value || el.getAttribute('value') || '';
                            el.parentNode.replaceChild(span, el);
                        });

                        // 3. Clear styling for sig/date boxes
                        document.querySelectorAll('.ab4-sig-col, .ab4-sig-col--date').forEach(el => {
                            el.style.setProperty('border', 'none', 'important');
                            el.style.setProperty('background', 'transparent', 'important');
                            el.style.setProperty('box-shadow', 'none', 'important');
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

    if (loading) return (
        <div className="da-loading">
            <div className="spinner-border text-primary" role="status" />
        </div>
    );

    return (
        <div className="da-page">

            <div className="da-toolbar">
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

        </div>
    );
};

export default DownloadAgreement;
