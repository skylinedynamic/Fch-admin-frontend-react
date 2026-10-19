import React, { useState, useEffect } from 'react';
import { getActivityLogs, downloadActivityAttachment, updateActivityLog, deleteActivityLog } from '../../../modules/activity-log/services';
import { VISIBILITY_BADGE_STYLES } from '../../../modules/activity-log/constants';
import { downloadBlob } from '../../../utils/fileDownload';
import avatarDefault from "../../../../assets/images/users/avatar-1.jpg";
import '../StatisticsCardSkeleton.css';
import { toast } from 'react-toastify';
import DeleteConfirmationModal from '../Modals/DeleteConfirmationModal';
import ActivityEditModal from '../Modals/ActivityEditModal';
import {
    ENTITY_TYPE_LEAD, ENTITY_TYPE_BORROWER, ENTITY_TYPE_PARTNER,
    TYPE_EMAIL, TYPE_ACTIVITY, LOG_TYPE_EMAIL_UPDATE, LOG_TYPE_EMAIL_SENT,
    LOG_TYPE_ACTIVITY, LOG_TYPE_INVOICE_CREATE, LOG_TYPE_DOCUMENT_UPLOAD, LOG_TYPE_CHECKLIST_UPDATE,
    LOG_TYPE_PARTNER_CREATE, LOG_TYPE_PARTNER_UPDATE, LOG_TYPE_PARTNER_CONTACT_UPDATE, LOG_TYPE_PARTNER_DELETE, LOG_TYPE_PARTNER_PAYMENT,
    LOG_TYPE_BORROWER_CREATE, LOG_TYPE_BORROWER_UPDATE, LOG_TYPE_BORROWER_CONTACT_UPDATE, LOG_TYPE_BORROWER_PAYMENT, LOG_TYPE_BUSINESS_UPDATE,
    LOG_TYPE_LEAD_CREATE, LOG_TYPE_LEAD_UPDATE, LOG_TYPE_LEAD_DETAILS_UPDATE, LOG_TYPE_LEAD_CONTACT_UPDATE,
    LOG_TYPE_APPOINTMENT_CREATE, LOG_TYPE_APPOINTMENT_UPDATE, LOG_TYPE_APPOINTMENT_DELETE,
    LOG_TYPE_TASK_VERIFICATION, ENTITY_TYPE_FUNDING_REQUEST, ENTITY_TYPE_FUNDING_APPLICATION,
    LOG_TYPE_FUNDING_REQUEST_CREATE, LOG_TYPE_FUNDING_REQUEST_STATUS_UPDATE,
    LOG_TYPE_FUNDING_APPLICATION_STATUS_UPDATE
} from '../../../config/appConfig';

import { getFileIconConfig } from '../../../utils/fileIconConfig';
import { getAvatarConfig } from '../../../utils/activityIconConfig';
import { FUNDING_REVIEW_STATUS_COLORS } from '../../../config/funding';

export default function ActivitySidebar({ entityId, entityType, partnerId, borrowerEmail, partnerEmail, hostEmail, isHost, profileImage = null, loading: externalLoading = false, hideTopButtons = false, stickyTopOffset = '145px', disableSticky = false }) {
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [openIds, setOpenIds] = useState({});

    // Edit/Delete state
    const [editingActivity, setEditingActivity] = useState(null);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [deletingActivityId, setDeletingActivityId] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // `openByDefault` is how the entry shows before anyone has clicked it, so
    // the first click on an entry that starts open closes it.
    const toggleOpen = (id, openByDefault = false) => {
        setOpenIds(prev => ({ ...prev, [id]: !(prev[id] ?? openByDefault) }));
    };

    const handleDownload = async (activityId, file) => {
        try {
            const fileName = file.name || file;
            const filePath = file.path || file;

            if (!filePath) {
                console.error('No file path available for download');
                return;
            }

            const blob = await downloadActivityAttachment({
                activity_log_id: activityId,
                path: filePath
            });

            downloadBlob(blob, fileName);
        } catch (error) {
            console.error('Download failed:', error);
        }
    };

    const fetchActivities = async (currentPage = 1, append = false) => {
        if (!append) setLoading(true);
        else setLoadingMore(true);

        try {
            const params = {
                limit: 15, // Load 15 initially
                page: currentPage
            };
            if (entityId) {
                if (entityType === ENTITY_TYPE_LEAD) params.lead_id = entityId;
                if (entityType === ENTITY_TYPE_BORROWER || entityType === 'Client') params.borrower_id = entityId;
                if (entityType === ENTITY_TYPE_PARTNER) params.partner_id = entityId;
                if (entityType === ENTITY_TYPE_FUNDING_REQUEST) params.funding_request_id = entityId;
                if (entityType === ENTITY_TYPE_FUNDING_APPLICATION) params.funding_application_id = entityId;
            }

            const response = await getActivityLogs(params);

            let activityData = [];

            // Detect standard data array format inside object
            if (response && Array.isArray(response.data)) {
                activityData = response.data;
            }
            // Detect plain flat array
            else if (Array.isArray(response)) {
                activityData = response;
            }

            if (append) {
                setActivities(prev => {
                    const existingIds = new Set(prev.map(item => item.id));
                    const newItems = activityData.filter(item => !existingIds.has(item.id));

                    // If the backend ignored pagination and just sent the same exact data,
                    // forcefully kill the "Load More" button to stop infinite looping.
                    if (newItems.length === 0 && activityData.length > 0) {
                        setHasMore(false);
                    }

                    return [...prev, ...newItems];
                });
            } else {
                setActivities(activityData);
            }

            // Standard Laravel pagination response structures
            if (response?.meta?.last_page) {
                setHasMore(currentPage < response.meta.last_page);
            } else if (response?.last_page) {
                setHasMore(currentPage < response.last_page);
            } else {
                // If appending and we didn't receive unique items, setHasMore(false) is handled above.
                // Otherwise detect length constraints:
                if (activityData.length < params.limit || activityData.length === 0 || activityData.length > params.limit) {
                    setHasMore(false);
                } else if (append) {
                    // Check deduplicated state for flat arrays
                    setActivities(prev => {
                        // (Use the current length asynchronously isn't reliable here, rely on array length check above)
                        return prev;
                    });
                    // Keep it true mostly, but rely on newItems check to kill it if it loops!
                    setHasMore(true);
                } else {
                    setHasMore(true);
                }
            }

        } catch (err) {
            console.error('[Sidebar] Fetch Error:', err);
            if (!append) setActivities([]);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    // Load initial page
    useEffect(() => {
        setPage(1);
        setHasMore(true);
        fetchActivities(1, false);

        const handleRefresh = () => {
            setPage(1);
            setHasMore(true);
            fetchActivities(1, false);
        };
        window.addEventListener('refreshActivities', handleRefresh);
        return () => window.removeEventListener('refreshActivities', handleRefresh);
        // Deps are the entity identity ONLY. The email props are deliberately not
        // listed: fetchActivities() never reads them (the request is keyed purely
        // off entityId/entityType), and callers pass live form state
        // (borrowerEmail={formData.email}), so including them re-ran this effect on
        // every keystroke in the email field - refetching the list and flashing the
        // loading state. They are still used by the context effect below.
    }, [entityId, entityType]);

    useEffect(() => {
        window._activityEntityContext = {
            entityId,
            entityType,
            partnerId,
            borrowerEmail,
            partnerEmail,
            hostEmail,
            isHost
        };
    }, [entityId, entityType, partnerId, borrowerEmail, partnerEmail, hostEmail, isHost]);

    const handleLoadMore = () => {
        if (!hasMore || loadingMore) return;
        const nextPage = page + 1;
        setPage(nextPage);
        fetchActivities(nextPage, true);
    };

    // Edit handlers
    const openEdit = (activity) => {
        setEditingActivity(activity);
    };

    const handleActivityUpdated = () => {
        setLoading(true);
        fetchActivities(1, false);
        window.dispatchEvent(new CustomEvent('refreshActivities'));
    };

    const handleDeleteClick = (activityId) => {
        setDeletingActivityId(activityId);
        setDeleteModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!deletingActivityId) return;
        setIsDeleting(true);
        try {
            await deleteActivityLog(deletingActivityId);
            setDeleteModalOpen(false);
            setDeletingActivityId(null);
            toast.success('Activity deleted successfully');
            // Trigger skeleton loader immediately while reloading activity list
            setLoading(true);
            fetchActivities(1, false);
            window.dispatchEvent(new CustomEvent('refreshActivities'));
        } catch (err) {
            console.error('Delete failed:', err);
            toast.error(err.response?.data?.message || 'Failed to delete activity');
        } finally {
            setIsDeleting(false);
        }
    };

    const formatTime = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    };

    const formatRelativeDate = (dateStr) => {
        if (!dateStr) return '';
        const targetDate = new Date(dateStr);
        const today = new Date();

        const targetDateOnly = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
        const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());

        const diffDays = Math.round((targetDateOnly - todayOnly) / (1000 * 60 * 60 * 24));
        const timeStr = targetDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

        const dateString = targetDate.toLocaleDateString('en-US');

        if (diffDays === 0) return `Today at ${timeStr}`;
        if (diffDays === 1) return `Tomorrow at ${timeStr}`;
        if (diffDays === -1) return `Yesterday at ${timeStr}`;
        if (diffDays > 1 && diffDays <= 7) return `This Week (${dateString})`;
        if (diffDays > 7 && diffDays <= 31) return `This Month (${dateString})`;
        if (diffDays < -1 && diffDays >= -7) return `Last Week (${dateString})`;
        if (diffDays < -7 && diffDays >= -31) return `Last Month (${dateString})`;

        const yearDiff = targetDate.getFullYear() - today.getFullYear();
        if (yearDiff === -1 && diffDays >= -365) return `Last Year (${dateString})`;
        if (yearDiff === 1 && diffDays <= 365) return `Next Year (${dateString})`;

        // Anything else fallback to strict date format
        return `${targetDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} at ${timeStr}`;
    };

    // Color palette for creator initials
    const avatarColors = [
        'bg-primary-subtle text-primary',
        'bg-success-subtle text-success',
        'bg-warning-subtle text-warning',
        'bg-info-subtle text-info',
        'bg-danger-subtle text-danger',
        'bg-secondary-subtle text-secondary',
    ];

    const getAvatarColor = (name = '') => {
        const idx = name.charCodeAt(0) % avatarColors.length;
        return avatarColors[idx];
    };

    const getReminderStatusBadge = (status) => {
        if (!status) return null;
        const s = String(status).toLowerCase();
        
        let config = {
            bg: '#ffedd5',
            color: '#ea580c',
            icon: 'ri-time-line',
            label: 'Pending'
        };

        if (s === 'dismissed') {
            config = {
                bg: '#f1f5f9',
                color: '#475569',
                icon: 'ri-indeterminate-circle-line',
                label: 'Dismissed'
            };
        } else if (s === 'cancelled') {
            config = {
                bg: '#fee2e2',
                color: '#dc2626',
                icon: 'ri-close-circle-line',
                label: 'Cancelled'
            };
        } else if (s === 'snoozed') {
            config = {
                bg: '#e0f2fe',
                color: '#0284c7',
                icon: 'ri-zzz-line',
                label: 'Snoozed'
            };
        } else if (s === 'completed') {
            config = {
                bg: '#dcfce7',
                color: '#16a34a',
                icon: 'ri-checkbox-circle-line',
                label: 'Completed'
            };
        } else if (s === 'missed') {
            config = {
                bg: '#fee2e2',
                color: '#dc2626',
                icon: 'ri-close-circle-line',
                label: 'Missed'
            };
        } else if (s === 'sent') {
            config = {
                bg: '#e0f2fe',
                color: '#0284c7',
                icon: 'ri-notification-3-line',
                label: 'Sent'
            };
        } else {
            config = {
                bg: '#ffedd5',
                color: '#ea580c',
                icon: 'ri-time-line',
                label: status
            };
        }

        return (
            <span
                className="badge text-nowrap d-inline-flex align-items-center gap-1"
                style={{
                    backgroundColor: config.bg,
                    color: config.color,
                    borderRadius: '4px',
                    padding: '2px 6px',
                    fontSize: '10px',
                    fontWeight: '600',
                    lineHeight: '1.2',
                    border: 'none',
                    verticalAlign: 'middle',
                    cursor: 'help'
                }}
                title={`Reminder: ${config.label}`}
            >
                <i className={config.icon} style={{ fontSize: '11px', lineHeight: '1' }}></i>
                <span>{config.label}</span>
            </span>
        );
    };

    const getSubtitle = (activity) => {
        const logType = (activity.log_type_raw || activity.log_type || '').toLowerCase();
        const isEdited = !!activity.is_edited;
        const dateToUse = isEdited
            ? (activity.edited_at || activity.updated_at || activity.activity_date || activity.created_at)
            : (activity.activity_date || activity.created_at);
        const formattedDate = formatRelativeDate(dateToUse);
        const originalDateStr = activity.activity_date || activity.created_at;
        const editedTooltip = isEdited && originalDateStr
            ? `Originally: ${formatRelativeDate(originalDateStr)} (${originalDateStr})`
            : 'Edited';
        
        if (logType === 'email' || logType === 'email sent') {
            const emails = Array.isArray(activity.to_emails)
                ? activity.to_emails.join(', ')
                : (activity.to_emails || 'N/A');
            return (
                <span>
                    To: {emails} • Subject: {activity.subject || 'No Subject'} • {formattedDate}
                    {isEdited && (
                        <span className="ms-1 text-muted fst-italic fw-normal" title={editedTooltip} style={{ cursor: 'help' }}>
                            (Edited)
                        </span>
                    )}
                </span>
            );
        }

        return (
            <span>
                {formattedDate}
                {isEdited && (
                    <span className="ms-1 text-muted fst-italic fw-normal" title={editedTooltip} style={{ cursor: 'help' }}>
                        (Edited)
                    </span>
                )}
            </span>
        );
    };

    const getStatusColor = (status) => {
        const s = status.toLowerCase();

        const configKey = Object.keys(FUNDING_REVIEW_STATUS_COLORS).find(
            key => key.toLowerCase() === s || s.includes(key.toLowerCase())
        );
        if (configKey) {
            return FUNDING_REVIEW_STATUS_COLORS[configKey];
        }

        if (s === 'good' || s === 'strong') {
            return '#10B981';
        }
        if (s.includes('fail') || s.includes('miss')) {
            return '#EF4444';
        }
        return 'inherit';
    };

    const formatActivityTitle = (title) => {
        if (typeof title !== 'string') return title;

        if (title.includes('Status Changed:') || title.includes('Status Changed')) {
            const separator = title.includes('Status Changed:') ? 'Status Changed:' : 'Status Changed';
            const parts = title.split(separator);
            const prefix = (parts[0] + separator).trim();
            const statusPart = parts.slice(1).join(separator).trim();

            const arrow = statusPart.includes('→') ? '→' : (statusPart.includes('->') ? '->' : null);
            if (arrow) {
                const statuses = statusPart.split(arrow);
                const oldStatus = statuses[0].trim();
                const newStatus = statuses[1].trim();

                return (
                    <span className="d-inline-flex align-items-center flex-wrap gap-1">
                        <span className="text-dark me-1">{prefix}</span>
                        {/* Each status stays on one line, but the pair may wrap: forced onto
                            one line, long pairs ran off the right edge of the sidebar. */}
                        <span className="d-inline-flex align-items-center flex-wrap">
                            <span className="text-nowrap" style={{ color: getStatusColor(oldStatus) }}>{oldStatus}</span>
                            <span className="text-muted px-1" style={{ fontSize: '11px' }}>→</span>
                            <span className="text-nowrap" style={{ color: getStatusColor(newStatus) }}>{newStatus}</span>
                        </span>
                    </span>
                );
            } else {
                return (
                    <span className="d-inline-flex align-items-center flex-wrap gap-1">
                        <span className="text-dark me-1">{prefix}</span>
                        <span style={{ color: getStatusColor(statusPart) }}>{statusPart}</span>
                    </span>
                );
            }
        }

        return title;
    };

    const getTitle = (activity) => {
        let title = '';
        const logType = (activity.log_type || '').toLowerCase();
        if (activity.event_label) {
            title = activity.event_label;
        } else if (logType === 'email' || logType === 'email sent') {
            title = activity.subject ? `Email Sent: ${activity.subject}` : 'Email Sent';
        } else if (logType === 'activity') {
            const refType = activity.reference ? activity.reference : 'Activity';
            title = activity.subject ? `${refType}: ${activity.subject}` : `${refType} Logged`;
        } else {
            title = activity.subject || activity.log_type || 'Activity';
        }
        return formatActivityTitle(title);
    };

    const renderAvatar = (activity) => {
        const logTypeRaw = activity.log_type_raw || activity.log_type || '';
        const config = getAvatarConfig(logTypeRaw, activity.reference || '');
        const partnerImg = activity.partner_image;
        const borrowerImg = activity.borrower_image;

        // 1. LEAD EXCEPTION: Always show Lead-specific action icons
        const isLeadLog = [
            LOG_TYPE_LEAD_CREATE, LOG_TYPE_LEAD_UPDATE, LOG_TYPE_LEAD_DETAILS_UPDATE, LOG_TYPE_LEAD_CONTACT_UPDATE
        ].includes(logTypeRaw) || activity.entity_type === ENTITY_TYPE_LEAD;

        if (isLeadLog && config) {
            return (
                <div className="avatar-xs">
                    <div className={`avatar-title ${config.bgClass} rounded-circle material-shadow fs-16`}>
                        <i className={config.icon}></i>
                    </div>
                </div>
            );
        }

        // 2. COMMUNICATION & ACTION ICON PRIORITY: These log types ALWAYS show their dedicated icon
        // regardless of whether a partner/borrower image is available.
        const commIconTypes = [
            TYPE_EMAIL, TYPE_ACTIVITY,
            LOG_TYPE_EMAIL_SENT, LOG_TYPE_EMAIL_UPDATE,
            LOG_TYPE_ACTIVITY,
            LOG_TYPE_INVOICE_CREATE,
            LOG_TYPE_DOCUMENT_UPLOAD,
            LOG_TYPE_CHECKLIST_UPDATE,
            LOG_TYPE_PARTNER_CONTACT_UPDATE, LOG_TYPE_FUNDING_REQUEST_CREATE, 
            LOG_TYPE_FUNDING_REQUEST_STATUS_UPDATE, LOG_TYPE_FUNDING_APPLICATION_STATUS_UPDATE,
            LOG_TYPE_APPOINTMENT_CREATE, LOG_TYPE_APPOINTMENT_UPDATE, LOG_TYPE_APPOINTMENT_DELETE,
            LOG_TYPE_TASK_VERIFICATION,
        ];
        if (commIconTypes.includes(logTypeRaw) && config) {
            return (
                <div className="avatar-xs">
                    <div className={`avatar-title ${config.bgClass} rounded-circle material-shadow fs-16`}>
                        <i className={config.icon}></i>
                    </div>
                </div>
            );
        }

        // 3. ENTITY AVATAR PRIORITY: Show the Partner or Borrower's image/avatar for everything else (Appointments, Invoices, Updates, etc.)
        // This ensures consistent branding on the timeline.
        if (partnerImg) {
            return <img src={partnerImg} alt="Partner" className="avatar-xs rounded-circle material-shadow" style={{ objectFit: 'cover' }} />;
        }
        if (borrowerImg) {
            return <img src={borrowerImg} alt="Client" className="avatar-xs rounded-circle material-shadow" style={{ objectFit: 'cover' }} />;
        }

        // 4. FALLBACK: Specific Action Icons if no entity image available
        if (config) {
            return (
                <div className="avatar-xs">
                    <div className={`avatar-title ${config.bgClass} rounded-circle material-shadow fs-16`}>
                        <i className={config.icon}></i>
                    </div>
                </div>
            );
        }

        // 5. CAUSER FALLBACK: The person/admin who did the action
        if (activity.causer_image) {
            return (
                <img
                    src={activity.causer_image}
                    alt={activity.causer_name || 'User'}
                    className="avatar-xs rounded-circle material-shadow"
                    style={{ objectFit: 'cover' }}
                />
            );
        }

        // 6. INITIALS FALLBACK
        const creatorName = activity.causer_name || activity.creator?.name || 'System';
        return (
            <div className="avatar-xs">
                <div className={`avatar-title ${getAvatarColor(creatorName)} rounded-circle material-shadow fw-bold fs-14`}>
                    {creatorName.charAt(0).toUpperCase()}
                </div>
            </div>
        );
    };

    return (
        // Sticky: keep the same 1.5rem bottom gap as the cards beside it, so the
        // card doesn't run into the page footer, and size it to still fit the
        // viewport with that gap while it's stuck.
        <div className={`card activity-sidebar-card d-flex flex-column w-100 shadow-sm border-0 ${disableSticky ? 'mb-0' : 'mb-4'}`} style={disableSticky ? { border: 'none', flexGrow: 1, minHeight: 0 } : { height: `calc(100vh - ${stickyTopOffset} - 1.5rem)`, position: 'sticky', top: stickyTopOffset, zIndex: 10 }}>
            {/* Card Header */}
            <div className="card-header align-items-center justify-content-between d-flex flex-column flex-sm-row gap-2 flex-shrink-0" style={disableSticky ? { backgroundColor: '#fff' } : { position: 'sticky', top: '0', zIndex: 11, backgroundColor: '#fff' }}>
                <h5 className="card-title mb-0 fs-16">
                    <i className="ri-history-line align-middle me-2"></i>Activity
                </h5>
                {!hideTopButtons && (
                    <div className="d-flex gap-2 chip-actions w-100 w-sm-auto justify-content-center justify-content-sm-end">
                        <button
                            type="button"
                            className="btn btn-light btn-sm text-nowrap"
                            data-bs-toggle="modal"
                            data-bs-target="#emailComposeModal"
                            onClick={() => { window._activityEntityContext = { entityId, entityType, partnerId, borrowerEmail, partnerEmail, hostEmail, isHost }; }}
                        >
                            <i className="ri-mail-line align-middle me-1"></i>New Email
                        </button>
                        <button
                            type="button"
                            className="btn btn-light btn-sm text-nowrap"
                            data-bs-toggle="modal"
                            data-bs-target="#activityCreateModal"
                            onClick={() => { window._activityEntityContext = { entityId, entityType, partnerId, borrowerEmail, partnerEmail, hostEmail, isHost }; }}
                        >
                            <i className="ri-calendar-line align-middle me-1"></i>New Event
                        </button>
                    </div>
                )}
            </div>

            {/* Card Body with Scrollbar */}
            <div className="card-body p-0 pb-4 d-flex flex-column" style={disableSticky ? { minHeight: 0, flexGrow: 1 } : { minHeight: 0 }}>
                <div
                    className="activity-scroll-container flex-grow-1"
                    style={disableSticky ? { padding: '12px 16px', overflowY: 'auto', overflowX: 'hidden', minHeight: 0 } : {
                        overflowY: 'auto',
                        overflowX: 'hidden',
                        padding: '12px 16px',
                    }}
                >
                    <div className="tab-content text-muted">
                        <div className="tab-pane active show" role="tabpanel">
                            <div className="profile-timeline">

                                {loading || externalLoading ? (
                                    <div className="accordion accordion-flush">
                                        {[1, 2, 3].map((i) => (
                                            <div key={i} className="accordion-item border-0 mb-3">
                                                <div className="d-flex align-items-start p-2">
                                                    <div className="skeleton-shimmer rounded-circle me-3 flex-shrink-0" style={{ width: '36px', height: '36px' }}></div>
                                                    <div className="flex-grow-1">
                                                        <div className="skeleton-shimmer rounded mb-2" style={{ width: '45%', height: '14px' }}></div>
                                                        <div className="skeleton-shimmer rounded" style={{ width: '75%', height: '12px' }}></div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : activities.length === 0 ? (
                                    <div className="text-center py-5">
                                        <i className="ri-history-line fs-48 text-muted opacity-50"></i>
                                        <h6 className="mt-2 text-muted">No activity found</h6>
                                        <p className="text-muted small mb-0">No entries have been logged yet.</p>
                                    </div>
                                ) : (
                                    <div className="accordion accordion-flush" id="activityAccordion">
                                        {activities.map((activity, index) => {
                                            const itemId = activity.id ?? index;
                                            const hasDescription = !!activity.description;
                                            const hasAttachments = Array.isArray(activity.attachments) && activity.attachments.length > 0;
                                            const hasFieldChanges = !!activity.field_changes && Object.keys(activity.field_changes).length > 0;
                                            const hasSignatures = !!activity.signatures && !!(activity.signatures.previous || activity.signatures.new);
                                            const isCollapsible = hasDescription || hasAttachments || hasFieldChanges || hasSignatures;
                                            // Every entry starts collapsed, so a long history stays a
                                            // short list. An entry that holds signatures or a list of
                                            // changed fields says so with a link on its row (below), so
                                            // they are found without having to open each one.
                                            const openByDefault = false;
                                            const isOpen = openIds[itemId] ?? openByDefault;
                                            const detailsLabel = hasSignatures ? 'signatures' : hasFieldChanges ? 'changes' : null;

                                            return (
                                                <div key={itemId} className="accordion-item border-0">
                                                    <div className="accordion-header" id={`heading-${itemId}`}>
                                                        <a
                                                            className="accordion-button p-2 shadow-none"
                                                            style={{
                                                                cursor: isCollapsible ? 'pointer' : 'default',
                                                                background: 'transparent',
                                                                textDecoration: 'none',
                                                            }}
                                                            onClick={() => isCollapsible && toggleOpen(itemId, openByDefault)}
                                                            aria-expanded={isOpen}
                                                        >
                                                            <div className="d-flex w-100 align-items-start">
                                                                {/* Avatar */}
                                                                <div className="flex-shrink-0">
                                                                    {renderAvatar(activity)}
                                                                </div>

                                                                {/* Content */}
                                                                <div className="flex-grow-1 ms-3">
                                                                    <h6 className="fs-13 mb-0 text-dark d-flex align-items-center flex-wrap gap-2">
                                                                        <span>{getTitle(activity)}</span>
                                                                        {Boolean(activity.is_owner || activity.can_edit) && getReminderStatusBadge(activity.reminder_status)}
                                                                        {/* The visibility tag belongs to activities a person created and
                                                                            chose a level for. System entries (client created, invoice
                                                                            created ...) never had one chosen, so they show none. */}
                                                                        {Boolean(activity.is_manual && (activity.is_owner || activity.can_edit)) && activity.visibility && VISIBILITY_BADGE_STYLES[activity.visibility] && (
                                                                            <span
                                                                                className={`badge d-inline-flex align-items-center gap-1 text-nowrap ${VISIBILITY_BADGE_STYLES[activity.visibility].className}`}
                                                                                style={{ fontSize: '10px', padding: '2px 6px' }}
                                                                                title={`Visibility: ${VISIBILITY_BADGE_STYLES[activity.visibility].label}`}
                                                                            >
                                                                                <i className={VISIBILITY_BADGE_STYLES[activity.visibility].icon}></i>
                                                                                <span>{VISIBILITY_BADGE_STYLES[activity.visibility].label}</span>
                                                                            </span>
                                                                        )}
                                                                    </h6>
                                                                    <div className="fs-10 text-muted" style={{ fontWeight: '500' }}>
                                                                        by {activity.causer_name || activity.creator?.name || 'System'}
                                                                        <span className="mx-1"> • </span>
                                                                        <i className="ri-time-line align-middle me-1"></i>
                                                                        {getSubtitle(activity)}
                                                                        {detailsLabel && (
                                                                            <>
                                                                                <span className="mx-1"> • </span>
                                                                                <span className="text-primary fw-semibold">
                                                                                    {isOpen ? 'Hide' : 'View'} {detailsLabel}
                                                                                    <i className={`${isOpen ? 'ri-arrow-up-s-line' : 'ri-arrow-down-s-line'} align-middle`}></i>
                                                                                </span>
                                                                            </>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                {/* Edit/Delete: your own manual 'activity' entries only —
                                                                    the API refuses either on someone else's entry. */}
                                                                {(activity.log_type_raw === 'activity' || activity.log_name === 'activity')
                                                                    && (activity.can_edit || activity.can_delete) && (
                                                                    <div
                                                                        className="activity-item-actions flex-shrink-0 ms-2"
                                                                        onClick={(e) => e.stopPropagation()}
                                                                    >
                                                                        {activity.can_edit && (
                                                                        <button
                                                                            type="button"
                                                                            className="btn btn-outline-primary activity-action-btn"
                                                                            title="Edit activity"
                                                                            aria-label="Edit activity"
                                                                            onClick={() => openEdit(activity)}
                                                                        >
                                                                            <i className="ri-pencil-line" aria-hidden="true"></i>
                                                                        </button>
                                                                        )}
                                                                        {activity.can_delete && (
                                                                        <button
                                                                            type="button"
                                                                            className="btn btn-outline-danger activity-action-btn"
                                                                            title="Delete activity"
                                                                            aria-label="Delete activity"
                                                                            onClick={() => handleDeleteClick(itemId)}
                                                                        >
                                                                            <i className="ri-delete-bin-6-line" aria-hidden="true"></i>
                                                                        </button>
                                                                        )}
                                                                    </div>
                                                                )}

                                                                {/* Chevron */}

                                                            </div>
                                                        </a>
                                                    </div>

                                                    {/* Collapsible Body */}
                                                    {isCollapsible && (
                                                        <div
                                                            style={{
                                                                display: 'grid',
                                                                gridTemplateRows: isOpen ? '1fr' : '0fr',
                                                                transition: 'grid-template-rows 0.3s ease',
                                                                overflow: 'hidden',
                                                            }}
                                                        >
                                                            <div style={{ overflow: 'hidden' }}>
                                                                <div className="accordion-body ms-2 ps-5 py-2">
                                                                    {hasDescription && (
                                                                        <div
                                                                            className="text-muted mb-2 fs-13"
                                                                            dangerouslySetInnerHTML={{ __html: activity.description }}
                                                                        />
                                                                    )}

                                                                    {/* An edit to an application: each field that
                                                                        changed, old value and new. */}
                                                                    {hasFieldChanges && (
                                                                        <div className="table-responsive mb-2">
                                                                            <table className="table table-sm table-bordered fs-12 mb-0 align-middle">
                                                                                <thead className="table-light">
                                                                                    <tr>
                                                                                        <th>Field</th>
                                                                                        <th>Previous</th>
                                                                                        <th>New</th>
                                                                                    </tr>
                                                                                </thead>
                                                                                <tbody>
                                                                                    {Object.entries(activity.field_changes).map(([field, change]) => (
                                                                                        <tr key={field}>
                                                                                            <td className="fw-medium">{change?.label || field}</td>
                                                                                            <td className="text-muted text-break">{change?.from ?? '—'}</td>
                                                                                            <td className="text-break">{change?.to ?? '—'}</td>
                                                                                        </tr>
                                                                                    ))}
                                                                                </tbody>
                                                                            </table>
                                                                        </div>
                                                                    )}

                                                                    {/* A submit or re-submit: the signature that was replaced and the
                                                                        new one, side by side on one row - a small thumbnail for an
                                                                        e-signature, the typed name otherwise. */}
                                                                    {hasSignatures && (
                                                                        <div className="d-flex gap-2 mb-2">
                                                                            {[['previous', 'Previous'], ['new', activity.signatures.previous ? 'New' : 'Signature']]
                                                                                .filter(([key]) => activity.signatures[key])
                                                                                .map(([key, title]) => {
                                                                                    const signature = activity.signatures[key];
                                                                                    const isPrevious = key === 'previous';
                                                                                    const isImage = signature.type === 'esign' && signature.image;
                                                                                    return (
                                                                                        <div key={key} className="border rounded bg-white px-2 py-1" style={{ flex: '1 1 0', minWidth: 0 }}>
                                                                                            <div className="fs-11 fw-semibold text-uppercase text-muted mb-1">{title}</div>
                                                                                            <div
                                                                                                className="d-flex align-items-center justify-content-center border rounded bg-light mb-1"
                                                                                                style={{ height: 34, overflow: 'hidden' }}
                                                                                            >
                                                                                                {isImage ? (
                                                                                                    <img
                                                                                                        src={signature.image}
                                                                                                        alt={`${title} signature of ${signature.name || 'the borrower'}`}
                                                                                                        style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', opacity: isPrevious ? 0.5 : 1 }}
                                                                                                    />
                                                                                                ) : (
                                                                                                    <span className={`fs-12 fw-semibold text-truncate px-1 ${isPrevious ? 'text-decoration-line-through text-muted' : 'text-dark'}`}>
                                                                                                        {signature.name}
                                                                                                    </span>
                                                                                                )}
                                                                                            </div>
                                                                                            <div className="fs-11 text-muted lh-sm">
                                                                                                <div className="text-truncate">{isImage ? 'E-Signature' : 'Typed Name'}</div>
                                                                                                {signature.signed_at && <div className="text-truncate">{signature.signed_at}</div>}
                                                                                            </div>
                                                                                        </div>
                                                                                    );
                                                                                })}
                                                                        </div>
                                                                    )}

                                                                    {hasAttachments && (
                                                                        <div className="row g-2 mt-1">
                                                                            {activity.attachments.map((file, fIdx) => {
                                                                                const fileName = file.name || file;
                                                                                const fileIcon = getFileIconConfig(fileName);
                                                                                return (
                                                                                    <div key={fIdx} className="col-auto">
                                                                                        <div className="d-flex align-items-center p-2 rounded position-relative" style={{ minWidth: '150px' }}>
                                                                                            <div className="flex-shrink-0 me-2">
                                                                                                <i className={`fs-18 ${fileIcon.icon} ${fileIcon.color}`}></i>
                                                                                            </div>
                                                                                            <div className="flex-grow-1">
                                                                                                <h6 className="mb-0 fs-12">
                                                                                                    <a
                                                                                                        href="#"
                                                                                                        className="stretched-link text-body"
                                                                                                        onClick={(e) => {
                                                                                                            e.preventDefault();
                                                                                                            handleDownload(activity.id, file);
                                                                                                        }}
                                                                                                    >
                                                                                                        {file.name || file}
                                                                                                    </a>
                                                                                                </h6>
                                                                                                {file.size && (
                                                                                                    <small className="text-muted">{(file.size / 1024).toFixed(0)} KB</small>
                                                                                                )}
                                                                                            </div>
                                                                                        </div>
                                                                                    </div>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}

                                        {/* Load More Button Container */}
                                        {hasMore && activities.length > 0 && (
                                            <div className="text-center mt-3 mb-1">
                                                <button
                                                    className="btn btn-soft-primary btn-sm rounded-pill px-4"
                                                    onClick={handleLoadMore}
                                                    disabled={loadingMore}
                                                >
                                                    {loadingMore ? (
                                                        <><span className="spinner-border spinner-border-sm align-middle me-2"></span>Loading...</>
                                                    ) : (
                                                        <><i className="ri-arrow-down-line align-middle me-1"></i> Load More Activity</>
                                                    )}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Edit Modal matching ActivityCreateModal */}
            <ActivityEditModal
                activity={editingActivity}
                show={!!editingActivity}
                onClose={() => setEditingActivity(null)}
                onUpdated={handleActivityUpdated}
                isHost={isHost}
            />

            {/* Delete Confirmation Modal */}
            <DeleteConfirmationModal
                show={deleteModalOpen}
                onClose={() => {
                    if (!isDeleting) {
                        setDeleteModalOpen(false);
                        setDeletingActivityId(null);
                    }
                }}
                onConfirm={handleConfirmDelete}
                loading={isDeleting}
                text="Are you sure you want to delete this activity log? This cannot be undone."
            />

            <style dangerouslySetInnerHTML={{
                __html: `
                /* Hide default Bootstrap accordion arrow */
                .accordion-button::after {
                    display: none !important;
                }
                .accordion-button:not(.collapsed) {
                    color: inherit;
                    background-color: transparent;
                    box-shadow: none;
                }

                /* Custom scrollbar for activity list */
                .activity-scroll-container::-webkit-scrollbar {
                    width: 5px;
                }
                .activity-scroll-container::-webkit-scrollbar-track {
                    background: #f8f9fa;
                    border-radius: 10px;
                }
                .activity-scroll-container::-webkit-scrollbar-thumb {
                    background: #dee2e6;
                    border-radius: 10px;
                }
                .activity-scroll-container::-webkit-scrollbar-thumb:hover {
                    background: #adb5bd;
                }

                /* Edit / Delete on an activity row: a small pair of soft square
                   icon buttons, always fully shown. They used to be dimmed until
                   the row was hovered, which read as disabled or blurred. */
                .activity-item-actions {
                    display: flex;
                    gap: 6px;
                }
                .activity-action-btn {
                    width: 28px;
                    height: 28px;
                    padding: 0;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 6px;
                    font-size: 14px;
                    line-height: 1;
                    transition: transform 0.15s ease, background-color 0.15s ease, color 0.15s ease;
                }
                .activity-action-btn:hover {
                    transform: translateY(-1px);
                }
                .activity-action-btn:focus-visible {
                    outline: 2px solid currentColor;
                    outline-offset: 1px;
                }
                @media (prefers-reduced-motion: reduce) {
                    .activity-action-btn { transition: none; }
                    .activity-action-btn:hover { transform: none; }
                }

                /* Avatar sizing */
                .avatar-xs {
                    width: 36px;
                    height: 36px;
                    display: inline-flex;
                    flex-shrink: 0;
                }
                .avatar-title {
                    width: 100%;
                    height: 100%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 14px;
                }

                /* Fixed profile-timeline vertical line alignment */
                .profile-timeline::before {
                    left: 18px !important;
                    top: 10px !important;
                    height: calc(100% - 20px) !important;
                }
                .profile-timeline .accordion-item {
                    position: relative;
                }
                .profile-timeline .avatar-xs {
                    z-index: 2;
                    background: #fff;
                }
            `}} />
        </div >
    );
}