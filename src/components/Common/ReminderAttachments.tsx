import React, { useState } from 'react';
import { apiClient as api } from '../../lib/http/apiClient';
import { handleFileDownload } from '../../utils/fileDownload';

export interface ReminderAttachment {
    name: string;
    path: string;
}

interface ReminderAttachmentsProps {
    reminderId?: number | null;
    attachments?: ReminderAttachment[] | null;
    label?: string;
    // Just the file links, no label or boxed rows — for sitting inside a
    // details grid next to Reminder Time / Notes, which label it themselves.
    compact?: boolean;
}

const BASE_URL = (import.meta as any).env.VITE_BASE_API_URL || '';
const MIN_SPINNER_MS = 600;

// Stored paths look like "storage/attachments/<file>"; older rows may omit the
// prefix. Used only as the fallback when the API download itself fails.
const buildFileUrl = (path?: string): string | undefined => {
    if (!path) return undefined;
    if (/^https?:\/\//i.test(path)) return path;
    const clean = path.trim().replace(/^\/+/, '');
    const withPrefix = clean.startsWith('storage/') ? clean : `storage/${clean}`;
    return BASE_URL ? encodeURI(`${BASE_URL.replace(/\/+$/, '')}/${withPrefix}`) : undefined;
};

// The files attached to a reminder, with the file name visible so you can tell
// what the task is about. Shared by the due-reminder popup and the Task &
// Reminder Details modal.
export default function ReminderAttachments({ reminderId, attachments, label = 'Files', compact = false }: ReminderAttachmentsProps) {
    const [downloading, setDownloading] = useState<Record<number, boolean>>({});

    if (!attachments || attachments.length === 0) return null;

    // One file takes the full width; two or more sit two per row (one per row
    // on a phone).
    const fileColClass = attachments.length > 1 ? 'col-md-6' : 'col-12';

    const download = async (attachment: ReminderAttachment, idx: number) => {
        setDownloading((p) => ({ ...p, [idx]: true }));
        const startedAt = Date.now();
        // handleFileDownload reads a JSON error returned inside the blob (so the
        // server's real reason is toasted instead of a generic failure) and
        // falls back to the file's public URL before giving up.
        await handleFileDownload(
            () => api.get(`/common/reminders/${reminderId}/attachments/download`, {
                params: { path: attachment.path },
                responseType: 'blob',
                _skipToast: true,
            } as any),
            attachment.name,
            buildFileUrl(attachment.path),
        );
        // A small file comes back in milliseconds and the spinner would flash by
        // unseen, leaving the click looking like it did nothing — hold the
        // loading state long enough to read.
        const elapsed = Date.now() - startedAt;
        if (elapsed < MIN_SPINNER_MS) {
            await new Promise((resolve) => setTimeout(resolve, MIN_SPINNER_MS - elapsed));
        }
        setDownloading((p) => ({ ...p, [idx]: false }));
    };

    if (compact) {
        return (
            <div className="row g-2">
                {attachments.map((att, idx) => (
                    <div key={idx} className={fileColClass}>
                        <div
                            role="button"
                            tabIndex={0}
                            className={`d-flex align-items-center gap-2 h-100 reminder-attachment-chip ${downloading[idx] ? 'is-downloading' : ''}`}
                            onClick={() => !downloading[idx] && download(att, idx)}
                            onKeyDown={(e) => { if (e.key === 'Enter' && !downloading[idx]) download(att, idx); }}
                            title={`Download: ${att.name}`}
                            aria-busy={!!downloading[idx]}
                        >
                            <i className="ri-file-3-line text-primary fs-14 flex-shrink-0"></i>
                            <span className="fw-medium text-dark flex-grow-1 reminder-attachment-name">
                                {downloading[idx] ? 'Downloading…' : att.name}
                            </span>
                            {downloading[idx]
                                ? <span className="spinner-border spinner-border-sm text-primary flex-shrink-0 reminder-attachment-spinner"></span>
                                : <i className="ri-download-2-line text-primary fs-14 flex-shrink-0"></i>}
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="mb-3">
            <label className="text-muted fs-11 text-uppercase fw-bold mb-2 d-block">{label}</label>
            <div className="row g-2">
                {attachments.map((att, idx) => (
                    <div key={idx} className={fileColClass}>
                        <div
                            role="button"
                            tabIndex={0}
                            className={`d-flex align-items-center h-100 bg-light rounded border border-light-subtle px-3 py-2 gap-2 reminder-attachment-item ${downloading[idx] ? 'is-downloading' : ''}`}
                            onClick={() => !downloading[idx] && download(att, idx)}
                            onKeyDown={(e) => { if (e.key === 'Enter' && !downloading[idx]) download(att, idx); }}
                            title={`Download: ${att.name}`}
                            aria-busy={!!downloading[idx]}
                        >
                            <i className="ri-file-3-line text-primary fs-16 flex-shrink-0"></i>
                            <span className="fw-medium fs-13 flex-grow-1 text-dark reminder-attachment-name">
                                {att.name}
                                {downloading[idx] && (
                                    <span className="text-muted fw-normal fs-12 ms-2">Downloading…</span>
                                )}
                            </span>
                            <span className="btn btn-sm btn-soft-primary rounded-circle p-1 d-flex align-items-center justify-content-center border-0 flex-shrink-0 reminder-attachment-download-btn">
                                {downloading[idx]
                                    ? <span className="spinner-border spinner-border-sm reminder-attachment-spinner"></span>
                                    : <i className="ri-download-2-line fs-14"></i>}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
