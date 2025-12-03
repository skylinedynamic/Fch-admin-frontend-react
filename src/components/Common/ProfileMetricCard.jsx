import React from 'react';
import PropTypes from 'prop-types';

const ProfileMetricCard = ({ label, value, icon }) => {
    return (
        <a href="#" className="d-flex align-items-center border rounded bg-white metrics-item me-3 mb-3 position-relative text-decoration-none px-3 py-2 shadow-sm">
            <i className={`${icon} me-2 text-warning fs-4`}></i>
            <div className="metrics-content">
                <div className="metrics-label text-muted">{label}</div>
                <div className="metrics-value fw-semibold">{value}</div>
            </div>
        </a>
    );
};

ProfileMetricCard.propTypes = {
    label: PropTypes.string.isRequired,
    value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    icon: PropTypes.string.isRequired
};

export default ProfileMetricCard;
