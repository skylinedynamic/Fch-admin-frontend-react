import React, { useState, useEffect } from 'react';
import { getActivityLogs } from '../../../modules/activity-log/services';
import avatarDefault from '../../../../assets/images/users/avatar-1.jpg';
import '../StatisticsCardSkeleton.css';

export default function ActivitySidebar({ entityId, entityType, profileImage = null }) {
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [openIds, setOpenIds] = useState({});

    const toggleOpen = (id) => {
        setOpenIds(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const fetchActivities = async () => {
        setLoading(true);
        try {
            const params = { limit: 50 };
            if (entityId) {
                if (entityType === 'Borrower' || entityType === 'Lead' || entityType === 'Client') params.borrower_id = entityId;
                if (entityType === 'Partner') params.partner_id = entityId;
            }

            const response = await getActivityLogs(params);

            let activityData = [];
            if (response && Array.isArray(response.data)) {
                activityData = response.data;
            } else if (Array.isArray(response)) {
                activityData = response;
            }

            setActivities(activityData);
        } catch (err) {
            console.error('[Sidebar] Fetch Error:', err);
            setActivities([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchActivities();
        const handleRefresh = () => fetchActivities();
        window.addEventListener('refreshActivities', handleRefresh);
        return () => window.removeEventListener('refreshActivities', handleRefresh);
    }, [entityId, entityType]);

    const formatTime = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
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
            return `To: ${emails} • Subject: ${activity.subject || 'No Subject'} • ${formatTime(activity.created_at)}`;
        }
        const subject = activity.subject || '';
        const time = formatTime(activity.created_at);
        return subject ? `${subject} — ${time}` : time;
    };

    const getTitle = (activity) => {
        if (activity.log_type === 'email') return 'Email Sent';
        return activity.creator?.name || activity.subject || activity.log_type || 'Activity';
    };

    const renderAvatar = (activity) => {
        const creatorName = activity.creator?.name || '';
        const initial = creatorName.charAt(0).toUpperCase() || '?';
        const colorClass = getAvatarColor(creatorName);

        // Use any provided dynamic image first (Partner, Borrower, Lead, or fallback to Creator)
        const dynamicImage = activity.partner_image || activity.borrower_image || activity.lead_image || activity.creator?.avatar;

        if (dynamicImage) {
            return (
                <img
                    src={dynamicImage}
                    alt={creatorName}
                    className="avatar-xs rounded-circle material-shadow"
                    style={{ objectFit: 'cover' }}
                />
            );
        }

        if (activity.log_type === 'email') {
            return (
                <div className="avatar-xs">
                    <div className="avatar-title bg-primary-subtle text-primary rounded-circle material-shadow">
                        <i className="ri-mail-send-line"></i>
                    </div>
                </div>
            );
        }

        if (activity.log_type === 'activity' && activity.reference === 'event') {
            return (
                <div className="avatar-xs">
                    <div className="avatar-title bg-info-subtle text-info rounded-circle material-shadow">
                        <i className="ri-calendar-event-line"></i>
                    </div>
                </div>
            );
        }

        return (
            <div className="avatar-xs">
                <div className={`avatar-title ${colorClass} rounded-circle material-shadow fw-bold`}>
                    {initial}
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

                                {loading ? (
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
                                                                    <h6 className="fs-14 mb-1 text-dark">
                                                                        {getTitle(activity)}
                                                                    </h6>
                                                                    <small className="text-muted">{getSubtitle(activity)}</small>
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
                                                                            {activity.attachments.map((file, fIdx) => (
                                                                                <div key={fIdx} className="col-auto">
                                                                                    <div className="d-flex border border-dashed p-2 rounded position-relative">
                                                                                        <div className="flex-shrink-0">
                                                                                            <i className="ri-file-zip-line fs-17 text-info"></i>
                                                                                        </div>
                                                                                        <div className="flex-grow-1 ms-2">
                                                                                            <h6 className="mb-0 fs-12">
                                                                                                <a href="#" className="stretched-link text-body">
                                                                                                    {file.name || file}
                                                                                                </a>
                                                                                            </h6>
                                                                                            {file.size && (
                                                                                                <small className="text-muted">{(file.size / 1024).toFixed(0)} KB</small>
                                                                                            )}
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
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
            `}} />
        </div>
    );
}
