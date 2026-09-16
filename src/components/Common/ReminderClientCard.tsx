import React from 'react';
import { Link } from 'react-router-dom';
import {
    ReminderClient,
    ReminderRelated,
    getReminderClientPath,
    getReminderRelatedPath,
} from '../../config/reminders';

interface ReminderClientCardProps {
    client?: ReminderClient | null;
    related?: ReminderRelated | null;
    // Called before navigating so the hosting modal can close itself.
    onNavigate?: () => void;
}

const getInitials = (name?: string | null) =>
    (name || '?')
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join('') || '?';

// Who a reminder is for, with a shortcut to their file. Shared by the due-
// reminder popup and the Task & Reminder Details modal.
export default function ReminderClientCard({ client, related, onNavigate }: ReminderClientCardProps) {
    const clientPath = getReminderClientPath(client, related);
    const relatedPath = getReminderRelatedPath(related);

    if (!client) {
        return (
            <div className="reminder-client-card rounded border p-3 d-flex align-items-center gap-2">
                <i className="ri-user-unfollow-line fs-18 text-muted"></i>
                <span className="text-muted fs-13">No client is linked to this reminder.</span>
            </div>
        );
    }

    return (
        <div className="reminder-client-card rounded border p-3">
            <div className="d-flex align-items-center gap-3">
                <div className="avatar-sm flex-shrink-0">
                    <span className="avatar-title rounded-circle reminder-client-avatar fw-bold fs-14">
                        {getInitials(client.name)}
                    </span>
                </div>
                <div className="flex-grow-1 overflow-hidden">
                    <div className="d-flex align-items-center gap-2 flex-wrap">
                        <span className="fw-bold text-dark fs-14 text-truncate">{client.name || 'Unnamed'}</span>
                        <span className="badge bg-primary-subtle text-primary fs-10 fw-semibold">{client.type_label}</span>
                    </div>
                    {client.business_name && client.business_name !== client.name && (
                        <div className="text-muted fs-12 text-truncate">
                            <i className="ri-building-line me-1"></i>{client.business_name}
                        </div>
                    )}
                    <div className="d-flex flex-wrap column-gap-3 fs-12 text-muted">
                        {client.phone && (
                            <a href={`tel:${client.phone}`} className="text-muted text-truncate">
                                <i className="ri-phone-line me-1"></i>{client.phone}
                            </a>
                        )}
                        {client.email && (
                            <a href={`mailto:${client.email}`} className="text-muted text-truncate">
                                <i className="ri-mail-line me-1"></i>{client.email}
                            </a>
                        )}
                    </div>
                    {related && relatedPath && (
                        <Link to={relatedPath} onClick={onNavigate} className="fs-12 fw-medium">
                            <i className="ri-file-list-3-line me-1"></i>{related.label}
                        </Link>
                    )}
                </div>
                {clientPath && (
                    <Link
                        to={clientPath}
                        onClick={onNavigate}
                        className="btn btn-sm btn-soft-primary fw-semibold flex-shrink-0 d-flex align-items-center"
                    >
                        <i className="ri-user-shared-line me-1"></i> Go to Client
                    </Link>
                )}
            </div>
        </div>
    );
}
