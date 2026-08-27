import React, { useState, useEffect, useRef } from 'react';
import Modal from 'bootstrap/js/dist/modal';
import { toast } from 'react-toastify';
import { apiClient as api } from '../../../lib/http/apiClient';
import { Skeleton } from 'primereact/skeleton';
import '../../../assets/css/reminder.css';

interface Reminder {
    id: number;
    reference: string;
    reference_type?: string;
    summary?: string;
    message?: string;
    set_date_time?: string;
    reminder_date_time?: string;
    send_at?: string;
    status: string;
    notes?: string;
    attachments?: Array<{ name: string; path: string }>;
}

interface ReminderViewModalProps {
    show: boolean;
    onHide: () => void;
    onSuccess?: () => void;
    reminder: Reminder | null;
}

/* ── helpers ─────────────────────────────────────────── */
const fmt = (iso?: string | null) => {
    if (!iso) return null;
    const d = new Date(iso);
    if (isNaN(d.getTime())) return null;
    return d;
};

const fmtDate = (d: Date) =>
    d.toLocaleString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

const fmtTime = (d: Date) =>
    d.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

/* ── DetailItem ──────────────────────────────────────── */
const DetailItem = ({ icon, label, value, className }: any) => (
    <div className={`col-6 ${className || ''}`}>
        <div className="d-flex align-items-center">
            <div className="flex-shrink-0 me-2">
                <div className="reminder-detail-icon-circle">
                    <i className={`${icon} fs-15 text-primary`}></i>
                </div>
            </div>
            <div className="flex-grow-1 overflow-hidden">
                <p className="text-muted mb-0 fw-bold reminder-detail-label">{label}</p>
                <div className="fw-bold text-dark reminder-detail-value">{value}</div>
            </div>
        </div>
    </div>
);

/* ── Modal ───────────────────────────────────────────── */
export default function ReminderViewModal({ show, onHide, onSuccess, reminder }: ReminderViewModalProps) {
    const modalRef = useRef<HTMLDivElement>(null);
    const modalInstanceRef = useRef<any>(null);
    const [loadingDismiss, setLoadingDismiss] = useState(false);
    const [expanded, setExpanded] = useState(false);
    const [downloadingFiles, setDownloadingFiles] = useState<Record<number, boolean>>({});

    /* Bootstrap modal lifecycle */
    useEffect(() => {
        if (!modalRef.current || modalInstanceRef.current) return;
        modalInstanceRef.current = new Modal(modalRef.current, { backdrop: 'static', keyboard: false });
    }, [modalRef]);

    useEffect(() => {
        const m = modalInstanceRef.current;
        if (!m) return;
        show ? m.show() : m.hide();
    }, [show]);

    useEffect(() => {
        // reset state when reminder changes
        setExpanded(false);
    }, [reminder?.id]);

    useEffect(() => {
        return () => {
            try {
                modalInstanceRef.current?.hide();
                modalInstanceRef.current?.dispose();
            } catch (_) { }
            modalInstanceRef.current = null;
        };
    }, []);

    /* derived values */
    const typeStr = reminder?.reference || 'Activity';

    // Activity date: when the actual task/call/event is scheduled
    const activityDate = fmt(reminder?.set_date_time) ?? fmt(reminder?.send_at);
    // Reminder date: when the user gets reminded (may differ from activity date)
    const reminderDate = fmt(reminder?.reminder_date_time) ?? fmt(reminder?.send_at);

    const activityDateStr = activityDate ? fmtDate(activityDate) : '—';
    const activityTimeStr = activityDate ? fmtTime(activityDate) : '—';
    const reminderDateStr  = reminderDate ? fmtDate(reminderDate) : '—';
    const reminderTimeStr  = reminderDate ? fmtTime(reminderDate) : '—';

    /* dismiss */
    const dismissReminder = async () => {
        if (!reminder) return;
        setLoadingDismiss(true);
        try {
            const res = await api.post(`/common/reminders/${reminder.id}/dismiss`);
            toast.success(res.data?.message || 'Reminder dismissed successfully');
            if (onSuccess) onSuccess();
            onHide();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to dismiss reminder');
        } finally {
            setLoadingDismiss(false);
        }
    };

    /* download */
    const handleDownload = async (attachment: { name: string; path: string }, idx: number) => {
        setDownloadingFiles(p => ({ ...p, [idx]: true }));
        try {
            const res = await api.get(`/common/reminders/${reminder?.id}/attachments/download`, {
                params: { path: attachment.path },
                responseType: 'blob',
            });
            const blob = new Blob([res.data], { type: res.headers['content-type'] || 'application/octet-stream' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = attachment.name;
            document.body.appendChild(a);
            a.click();
            setTimeout(() => { document.body.removeChild(a); window.URL.revokeObjectURL(url); }, 100);
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Failed to download file');
        } finally {
            setDownloadingFiles(p => ({ ...p, [idx]: false }));
        }
    };

    /* description expand/collapse */
    const rawDescription = reminder?.message || reminder?.notes || '';
    const plainText = rawDescription.replace(/<[^>]*>/g, '').trim();
    const needsExpansion = plainText.length > 220;

    return (
        <div className="modal fade flip" ref={modalRef} tabIndex={-1} aria-hidden="true">
            <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable reminder-view-modal-dialog">
                <div className="modal-content border-0 shadow-lg">

                    {/* Header */}
                    <div className="modal-header p-3 bg-info-subtle border-0">
                        <h5 className="modal-title d-flex align-items-center gap-2">
                            <i className="ri-calendar-todo-line text-info fs-18"></i>
                            Task &amp; Reminder Details
                        </h5>
                        <button type="button" className="btn-close" onClick={onHide} aria-label="Close"></button>
                    </div>

                    {/* Body */}
                    <div className="modal-body reminder-view-modal-body">
                        {!reminder ? (
                            /* Skeleton */
                            <div>
                                <Skeleton width="120px" height="11px" className="mb-2" />
                                <Skeleton width="70%" height="26px" className="mb-4" />
                                <Skeleton width="100px" height="11px" className="mb-2" />
                                <Skeleton width="100%" height="70px" className="mb-4 rounded-3" />
                                <div className="row g-3 mb-4">
                                    {[1, 2, 3, 4].map(i => (
                                        <div className="col-6" key={i}>
                                            <div className="d-flex align-items-center gap-2">
                                                <Skeleton shape="circle" size="32px" />
                                                <div className="flex-grow-1">
                                                    <Skeleton width="60px" height="10px" className="mb-2" />
                                                    <Skeleton width="90px" height="13px" />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="d-flex justify-content-end gap-2 pt-3 border-top">
                                    <Skeleton width="70px" height="34px" borderRadius="6px" />
                                </div>
                            </div>
                        ) : (
                            <div>
                                {/* Subject */}
                                <div className="mb-3">
                                    <div className="d-flex align-items-start justify-content-between gap-2 mb-1 flex-wrap">
                                        <label className="text-muted fs-11 text-uppercase fw-bold mb-0">Subject</label>
                                        <span className="badge rounded-pill px-2 bg-primary-subtle text-primary fw-bold fs-11">
                                            {typeStr.toUpperCase()}
                                        </span>
                                    </div>
                                    <h4 className="fw-bold mb-2 text-dark fs-16 fs-md-18">{reminder.summary || 'Activity'}</h4>
                                    {/* Activity Date + Time inline */}
                                    <div className="d-flex flex-wrap align-items-center gap-2 fs-13 text-muted fw-medium">
                                        <span>
                                            <i className="ri-calendar-event-line me-1 text-primary"></i>
                                            {activityDateStr}
                                        </span>
                                        <span className="text-muted">•</span>
                                        <span>
                                            <i className="ri-time-line me-1 text-primary"></i>
                                            {activityTimeStr}
                                        </span>
                                    </div>
                                </div>

                                <hr className="border-dashed my-3" />

                                {/* Description */}
                                {rawDescription ? (
                                    <div className="mb-3">
                                        <label className="text-muted fs-11 text-uppercase fw-bold mb-2 d-block">Description</label>
                                        <div className="bg-white rounded-3 border border-light-subtle reminder-description-box">
                                            {/* Collapsed: exactly 4 lines via CSS line-clamp — clean cut, no blur */}
                                            {!expanded ? (
                                                <div
                                                    className="text-dark fs-14 reminder-description-collapsed"
                                                    dangerouslySetInnerHTML={{ __html: rawDescription }}
                                                />
                                            ) : (
                                                /* Expanded: full text */
                                                <div
                                                    className="text-dark fs-14 reminder-description-expanded"
                                                    dangerouslySetInnerHTML={{ __html: rawDescription }}
                                                />
                                            )}
                                            {/* See more / See less — always below text, clear gap */}
                                            {needsExpansion && (
                                                <div className="mt-2 pt-1 border-top border-light">
                                                    <button
                                                        type="button"
                                                        className="btn btn-link p-0 fs-12 fw-semibold text-primary text-decoration-none shadow-none d-flex align-items-center gap-1"
                                                        onClick={() => setExpanded(v => !v)}
                                                    >
                                                        {expanded
                                                            ? <><i className="ri-arrow-up-s-line fs-14"></i> See less</>
                                                            : <><i className="ri-arrow-down-s-line fs-14"></i> See more</>
                                                        }
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ) : null}

                                {/* Details grid: 4 items */}
                                <div className="row g-3 mb-3">
                                    <DetailItem icon="ri-calendar-event-line" label="Activity Date" value={activityDateStr} />
                                    <DetailItem icon="ri-time-line"           label="Activity Time" value={activityTimeStr} />
                                    <DetailItem icon="ri-alarm-line"          label="Reminder Date" value={reminderDateStr} />
                                    <DetailItem icon="ri-alarm-line"          label="Reminder Time" value={reminderTimeStr} />
                                    <DetailItem icon="ri-checkbox-circle-line" label="Status" value={<span className="text-capitalize">{reminder.status}</span>} />
                                    {reminder.attachments && reminder.attachments.length > 0 && (
                                        <DetailItem icon="ri-attachment-2" label="Attachments" value={reminder.attachments.length === 1 ? '1 file' : `${reminder.attachments.length} files`} />
                                    )}
                                </div>

                                {/* Attachments list */}
                                {reminder.attachments && reminder.attachments.length > 0 && (
                                    <div className="mb-3">
                                        <label className="text-muted fs-11 text-uppercase fw-bold mb-2 d-block">Files</label>
                                        <div className="d-flex flex-column gap-2">
                                            {reminder.attachments.map((att, idx) => (
                                                <div
                                                    key={idx}
                                                    className={`d-flex align-items-center bg-light rounded border border-light-subtle px-3 py-2 gap-2 reminder-attachment-item ${downloadingFiles[idx] ? 'is-downloading' : ''}`}
                                                    onClick={() => !downloadingFiles[idx] && handleDownload(att, idx)}
                                                    title={`Download: ${att.name}`}
                                                >
                                                    <i className="ri-file-3-line text-primary fs-16 flex-shrink-0"></i>
                                                    <span className="fw-medium fs-13 flex-grow-1 text-dark reminder-attachment-name">
                                                        {att.name}
                                                    </span>
                                                    <span
                                                        className="btn btn-sm btn-soft-primary rounded-circle p-1 d-flex align-items-center justify-content-center border-0 flex-shrink-0 reminder-attachment-download-btn"
                                                    >
                                                        {downloadingFiles[idx]
                                                            ? <span className="spinner-border spinner-border-sm reminder-attachment-spinner"></span>
                                                            : <i className="ri-download-2-line fs-14"></i>
                                                        }
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Footer actions */}
                                <div className="mt-3 pt-3 border-top d-flex flex-wrap justify-content-end gap-2">
                                    <button type="button" className="btn btn-light px-4" onClick={onHide}>
                                        <i className="ri-close-line me-1"></i> Close
                                    </button>
                                    {reminder.status === 'pending' && (
                                        <button
                                            type="button"
                                            className="btn btn-danger fw-medium d-flex align-items-center px-4"
                                            onClick={dismissReminder}
                                            disabled={loadingDismiss}
                                        >
                                            {loadingDismiss
                                                ? <><span className="spinner-border spinner-border-sm me-2"></span>Dismissing...</>
                                                : <><i className="ri-notification-off-line me-1"></i>Dismiss Reminder</>
                                            }
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
