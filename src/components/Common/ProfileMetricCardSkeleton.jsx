import React from 'react';
import './StatisticsCardSkeleton.css'; // Reusing the same CSS for shimmer effect

const ProfileMetricCardSkeleton = () => {
    return (
        <div className="d-flex align-items-center border rounded bg-white metrics-item me-3 mb-3 position-relative text-decoration-none px-3 py-2 shadow-sm" style={{ minWidth: '160px' }}>
            <div className="skeleton-shimmer rounded-circle" style={{ width: '24px', height: '24px' }}></div>
            <div className="metrics-content ms-2 flex-grow-1">
                <div className="skeleton-shimmer mb-1 rounded" style={{ width: '70%', height: '12px' }}></div>
                <div className="skeleton-shimmer rounded" style={{ width: '40%', height: '16px' }}></div>
            </div>
        </div>
    );
};

export default ProfileMetricCardSkeleton;
