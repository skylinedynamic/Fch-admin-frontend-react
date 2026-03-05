import React, { useState, useEffect } from 'react';
import { getActivityLogs } from '../../../modules/activity-log/services';
import avatarDefault from '../../../../assets/images/users/avatar-1.jpg'; // Assuming there's a default
import '../StatisticsCardSkeleton.css';

export default function ActivitySidebar({ entityId, entityType }) {
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchActivities = async () => {
        setLoading(true);
        try {
            const params = {
                limit: 20
            };
            if (entityType === 'Borrower') params.borrower_id = entityId;
            if (entityType === 'Partner') params.partner_id = entityId;

            const response = await getActivityLogs(params);
            setActivities(response.data || []);
        } catch (err) {
            console.error('Failed to fetch activities:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (entityId) {
            fetchActivities();
        }

        // Listen for refresh event
        const handleRefresh = () => fetchActivities();
        window.addEventListener('refreshActivities', handleRefresh);

        return () => {
            window.removeEventListener('refreshActivities', handleRefresh);
        };
    }, [entityId, entityType]);

    // Format date/time
    const formatDateTime = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    };

    const getIcon = (reference) => {
        switch (reference?.toLowerCase()) {
            case 'call': return 'ri-phone-line text-primary';
            case 'meeting': return 'ri-group-line text-success';
            case 'email': return 'ri-mail-line text-info';
            case 'event': return 'ri-calendar-event-line text-warning';
            default: return 'ri-file-list-3-line text-muted';
        }
    };

    return (
        <div className="card">
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
            <div className="card-body">
                <div className="tab-content text-muted">
                    <div className="tab-pane active show" id="today" role="tabpanel">
                        <div className="profile-timeline">
                            {loading ? (
                                <div className="activity-skeletons p-2">
                                    {[1, 2, 3, 4, 5].map((i) => (
                                        <div key={i} className="accordion-item border-0 mb-3">
                                            <div className="d-flex align-items-start p-2">
                                                <div className="flex-shrink-0">
                                                    <div className="skeleton-shimmer rounded-circle" style={{ width: '32px', height: '32px' }}></div>
                                                </div>
                                                <div className="flex-grow-1 ms-3">
                                                    <div className="skeleton-shimmer rounded mb-2" style={{ width: '80%', height: '14px' }}></div>
                                                    <div className="skeleton-shimmer rounded" style={{ width: '40%', height: '10px' }}></div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : activities.length === 0 ? (
                                <div className="text-center py-5">
                                    <div className="avatar-lg bg-light rounded-circle mx-auto mb-3">
                                        <div className="avatar-title text-primary display-4">
                                            <i className="ri-history-line"></i>
                                        </div>
                                    </div>
                                    <h5 className="mt-2">No activity found</h5>
                                    <p className="text-muted mb-0">No activities have been logged yet for this {entityType}.</p>
                                </div>
                            ) : (
                                <div className="accordion accordion-flush" id="activityAccordion">
                                    {activities.map((activity, index) => (
                                        <div className="accordion-item border-0" key={activity.id || index}>
                                            <div className="accordion-header" id={`heading${index}`}>
                                                <button
                                                    className={`accordion-button p-2 shadow-none ${index === 0 ? '' : 'collapsed'}`}
                                                    type="button"
                                                    data-bs-toggle="collapse"
                                                    data-bs-target={`#collapse${index}`}
                                                    aria-expanded={index === 0 ? "true" : "false"}
                                                    aria-controls={`collapse${index}`}
                                                >
                                                    <div className="d-flex w-100">
                                                        <div className="flex-shrink-0">
                                                            <div className="avatar-xs">
                                                                <div className={`avatar-title bg-light rounded-circle`}>
                                                                    <i className={getIcon(activity.reference)}></i>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="flex-grow-1 ms-3 text-start">
                                                            <h6 className="fs-14 mb-1">
                                                                {/* 'subject' for activity, 'subject' for email */}
                                                                {activity.subject || activity.log_name}
                                                            </h6>
                                                            <small className="text-muted">
                                                                {activity.log_name === 'email' ? 'Email' : activity.reference} • {formatDateTime(activity.activity_date || activity.created_at)}
                                                            </small>
                                                        </div>
                                                    </div>
                                                </button>
                                            </div>
                                            <div
                                                id={`collapse${index}`}
                                                className={`accordion-collapse collapse ${index === 0 ? 'show' : ''}`}
                                                aria-labelledby={`heading${index}`}
                                                data-bs-parent="#activityAccordion"
                                            >
                                                <div className="accordion-body ms-2 ps-5">
                                                    {activity.description && (
                                                        <div
                                                            className="text-muted mb-2 overflow-hidden"
                                                            style={{ maxWidth: '100%' }}
                                                            dangerouslySetInnerHTML={{ __html: activity.description }}
                                                        />
                                                    )}
                                                    {activity.created_by_user && (
                                                        <small className="d-block text-muted">
                                                            <i className="ri-user-line me-1"></i>
                                                            Logged by: {activity.created_by_user.name}
                                                        </small>
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
            </div>
        </div>
    );
}
