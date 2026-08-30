import React from 'react';
import PropTypes from 'prop-types';

/**
 * Reusable Statistics Card Component
 * Displays a statistic with an icon, title, and count value
 * 
 * @param {Object} props - Component props
 * @param {string} props.title - The title/label of the statistic
 * @param {number|string} props.count - The count/value to display
 * @param {string} props.icon - RemixIcon class name (e.g., 'ri-ticket-line')
 * @param {string} props.colorVariant - Bootstrap color variant (primary, warning, info, success, danger, etc.)
 * @param {string} props.colSize - Bootstrap column size (default: 'col-xl-3 col-md-6')
 */
const StatisticsCard = ({
    title,
    count,
    icon,
    colorVariant = 'primary',
    colSize = 'col-xl-3 col-md-6'
}) => {
    return (
        <div className={colSize}>
            <div className="card card-animate">
                <div className="card-body">
                    <div className="d-flex align-items-center">
                        <div className="avatar-sm flex-shrink-0">
                            <span className={`avatar-title bg-${colorVariant}-subtle text-${colorVariant} rounded-2 fs-2`}>
                                <i className={`${icon} text-${colorVariant}`} aria-hidden="true"></i>
                            </span>
                        </div>
                        <div className="flex-grow-1 overflow-hidden ms-3">
                            <p className="text-capitalize fw-medium text-muted text-truncate mb-1 kpi-title">
                                {title}
                            </p>
                            <div className="d-flex align-items-center mb-1">
                                <h4 className="fs-4 flex-grow-1 mb-0">
                                    <span className="counter-value" data-target={count}>
                                        {count}
                                    </span>
                                </h4>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

StatisticsCard.propTypes = {
    title: PropTypes.string.isRequired,
    count: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
    icon: PropTypes.string.isRequired,
    colorVariant: PropTypes.oneOf(['primary', 'secondary', 'success', 'danger', 'warning', 'info', 'light', 'dark']),
    colSize: PropTypes.string
};

export default StatisticsCard;
