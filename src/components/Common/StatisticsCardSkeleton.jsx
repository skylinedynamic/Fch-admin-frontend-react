import React from 'react';
import PropTypes from 'prop-types';
import './StatisticsCardSkeleton.css';

/**
 * Skeleton Loader for StatisticsCard Component
 * Displays a shimmer/skeleton effect while data is loading
 * 
 * @param {Object} props - Component props
 * @param {string} props.colSize - Bootstrap column size (default: 'col-xl-3 col-md-6')
 */
const StatisticsCardSkeleton = ({ colSize = 'col-xl-3 col-md-6' }) => {
    return (
        <div className={colSize}>
            <div className="card card-animate statistics-skeleton">
                <div className="card-body">
                    <div className="d-flex align-items-center">
                        {/* Icon Skeleton */}
                        <div className="avatar-sm flex-shrink-0">
                            <span className="avatar-title bg-light rounded-2 fs-2">
                                <div className="skeleton-shimmer skeleton-icon"></div>
                            </span>
                        </div>

                        {/* Text Content Skeleton */}
                        <div className="flex-grow-1 overflow-hidden ms-3">
                            {/* Title Skeleton */}
                            <div className="skeleton-shimmer skeleton-title"></div>

                            {/* Count Skeleton */}
                            <div className="skeleton-shimmer skeleton-count"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

StatisticsCardSkeleton.propTypes = {
    colSize: PropTypes.string
};

export default StatisticsCardSkeleton;
