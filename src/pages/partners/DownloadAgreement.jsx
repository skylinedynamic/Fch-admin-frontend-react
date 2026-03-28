import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { fetchSignedAgreementHtml } from '../../modules/agreement/services';
import { toast } from 'react-toastify';
import builderCss from '../../../assets/css/agreement-builder.css?raw';
import '../../../assets/css/agreement-builder.css';

const iframeDoc = `<!DOCTYPE html><html><head><meta charset="UTF-8"/><style>
${builderCss}
*,*::before,*::after{box-sizing:border-box!important}
html,body{margin:0!important;padding:0!important;background:white!important}
.page-break{height:40px!important;background:#525659!important;margin:0!important;display:block!important;page-break-before:always}
@media print{@page{size:A4;margin:15mm}.page-break{height:0!important;background:transparent!important;margin:0!important;page-break-before:always!important;break-before:page!important}}
</style></head><body>`;

const DownloadAgreement = () => {
    const { userId } = useParams();
    const [loading, setLoading] = useState(true);
    const iframeRef = useRef(null);

    useEffect(() => {
        if (!userId) { toast.error('User ID is missing'); return; }

        fetchSignedAgreementHtml(userId)
            .then(res => {
                const html = res?.data?.content_html;
                if (!html) { toast.error('Agreement not found'); return; }

                const doc = iframeRef.current?.contentDocument;
                if (!doc) return;

                doc.open();
                doc.write(iframeDoc + html + '</body></html>');
                doc.close();

                // Expand iframe to full content height (retry for fonts/images)
                [300, 800, 2000].forEach(ms =>
                    setTimeout(() => {
                        if (doc.body && iframeRef.current)
                            iframeRef.current.style.height = doc.body.scrollHeight + 'px';
                    }, ms)
                );
            })
            .catch(e => { console.error(e); toast.error('Failed to load agreement'); })
            .finally(() => setLoading(false));
    }, [userId]);

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
