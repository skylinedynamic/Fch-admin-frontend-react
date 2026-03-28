import React, { useState, useEffect } from 'react';
import { getActivityLogs, downloadActivityAttachment } from '../../../modules/activity-log/services';
import { downloadBlob } from '../../../utils/fileDownload';
import avatarDefault from '../../../../assets/images/users/avatar-1.jpg';
import '../StatisticsCardSkeleton.css';
import {
    ENTITY_TYPE_LEAD, ENTITY_TYPE_BORROWER, ENTITY_TYPE_PARTNER,
    TYPE_EMAIL, TYPE_ACTIVITY, LOG_TYPE_EMAIL_UPDATE, LOG_TYPE_EMAIL_SENT,
    LOG_TYPE_ACTIVITY, LOG_TYPE_INVOICE_CREATE, LOG_TYPE_DOCUMENT_UPLOAD, LOG_TYPE_CHECKLIST_UPDATE,
    LOG_TYPE_PARTNER_CREATE, LOG_TYPE_PARTNER_UPDATE, LOG_TYPE_PARTNER_CONTACT_UPDATE, LOG_TYPE_PARTNER_DELETE, LOG_TYPE_PARTNER_PAYMENT,
    LOG_TYPE_BORROWER_CREATE, LOG_TYPE_BORROWER_UPDATE, LOG_TYPE_BORROWER_CONTACT_UPDATE, LOG_TYPE_BORROWER_PAYMENT, LOG_TYPE_BUSINESS_UPDATE,
    LOG_TYPE_LEAD_CREATE, LOG_TYPE_LEAD_UPDATE, LOG_TYPE_LEAD_DETAILS_UPDATE, LOG_TYPE_LEAD_CONTACT_UPDATE,
    LOG_TYPE_APPOINTMENT_CREATE, LOG_TYPE_APPOINTMENT_UPDATE, LOG_TYPE_APPOINTMENT_DELETE
} from '../../../config/appConfig';

import { getFileIconConfig } from '../../../utils/fileIconConfig';
import { getAvatarConfig } from '../../../utils/activityIconConfig';

export default function ActivitySidebar({ entityId, entityType, profileImage = null, loading: externalLoading = false }) {
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [openIds, setOpenIds] = useState({});

    const toggleOpen = (id) => {
        setOpenIds(prev => ({ ...prev, [id]: !prev[id] }));
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
    }, [entityId, entityType]);

    const handleLoadMore = () => {
        if (!hasMore || loadingMore) return;
        const nextPage = page + 1;
        setPage(nextPage);
        fetchActivities(nextPage, true);
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

    const getSubtitle = (activity) => {
        if (activity.log_type === 'email') {
            const emails = Array.isArray(activity.to_emails)
                ? activity.to_emails.join(', ')
                : (activity.to_emails || 'N/A');
            return `To: ${emails} • Subject: ${activity.subject || 'No Subject'} • ${formatRelativeDate(activity.created_at)}`;
        }

        if (activity.log_type === 'activity') {
            const ref = activity.reference || 'N/A';
            // Use activity_date (if available from scheduling), else fallback to created_at
            const dateToUse = activity.activity_date || activity.created_at;
            return `Reference: ${ref} • ${formatRelativeDate(dateToUse)}`;
        }

        return formatRelativeDate(activity.created_at);
    };

    const getTitle = (activity) => {
        if (activity.event_label) return activity.event_label;
        if (activity.log_type === 'email') return 'Email Sent';
        if (activity.log_type === 'activity') return 'Activity Created';

        // Format system logs (just return the subject like "Borrower Created")
        return activity.subject || activity.log_type || 'Activity';
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
            LOG_TYPE_APPOINTMENT_CREATE, LOG_TYPE_APPOINTMENT_UPDATE, LOG_TYPE_APPOINTMENT_DELETE,
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
        <div className="card">
            {/* Card Header */}
            <div className="card-header px-2 py-2 align-items-center justify-content-between d-flex">
                <h4 style={{ padding: '8px 0px' }} className="card-title mb-0 me-2">
                    <i className="ri-history-line align-middle me-2"></i>Activity
                </h4>
                <div className="d-flex flex-wrap gap-2 chip-actions">
                    <button
                        type="button"
                        className="btn btn-light btn-sm"
                        data-bs-toggle="modal"
                        data-bs-target="#emailComposeModal"
                    >
                        <i className="ri-mail-line align-middle me-1"></i>New Email
                    </button>
                    <button
                        type="button"
                        className="btn btn-light btn-sm"
                        data-bs-toggle="modal"
                        data-bs-target="#activityCreateModal"
                    >
                        <i className="ri-calendar-line align-middle me-1"></i>New Event
                    </button>
                </div>
            </div>

            {/* Card Body with Scrollbar */}
            <div className="card-body p-0">
                <div
                    className="activity-scroll-container"
                    style={{
                        maxHeight: '520px',
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
                                            const isOpen = !!openIds[itemId];
                                            const hasDescription = !!activity.description;
                                            const hasAttachments = Array.isArray(activity.attachments) && activity.attachments.length > 0;
                                            const isCollapsible = hasDescription || hasAttachments;

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
                                                            onClick={() => isCollapsible && toggleOpen(itemId)}
                                                            aria-expanded={isOpen}
                                                        >
                                                            <div className="d-flex w-100 align-items-start">
                                                                {/* Avatar */}
                                                                <div className="flex-shrink-0">
                                                                    {renderAvatar(activity)}
                                                                </div>

                                                                {/* Content */}
                                                                <div className="flex-grow-1 ms-3">
                                                                    <h6 className="fs-14 mb-0 text-dark">
                                                                        {getTitle(activity)}
                                                                    </h6>
                                                                    <div className="fs-12 text-muted" style={{ fontWeight: '500' }}>
                                                                        by {activity.causer_name || activity.creator?.name || 'System'}
                                                                        <span className="mx-1"> • </span>
                                                                        <i className="ri-time-line align-middle me-1"></i>
                                                                        {getSubtitle(activity)}
                                                                    </div>
                                                                </div>

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

                                                                    {hasAttachments && (
                                                                        <div className="row g-2 mt-1">
                                                                            {activity.attachments.map((file, fIdx) => {
                                                                                const fileName = file.name || file;
                                                                                const fileIcon = getFileIconConfig(fileName);
                                                                                return (
                                                                                    <div key={fIdx} className="col-auto">
                                                                                        <div className="d-flex align-items-center border border-dashed p-2 rounded position-relative" style={{ minWidth: '150px' }}>
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
