import React from 'react';

export default function TenantConfigLoader() {
    return (
        <div className="row g-3 fade-panel">
            {/* Master Toggle Area Placeholder */}
            <div className="col-lg-12 mb-3">
                <div className="skeleton-line sk-w-250 sk-h-24 mb-2"></div>
                <div className="skeleton-line sk-w-45p sk-h-12 ms-4"></div>
            </div>

            {/* Form Fields placeholders */}
            <div className="col-lg-6">
                <div className="mb-3">
                    <div className="skeleton-line sk-w-150 sk-h-20 mb-2"></div>
                    <div className="skeleton-line w-100 sk-h-40"></div>
                    <div className="skeleton-line sk-w-200 sk-h-12 mt-1"></div>
                </div>
            </div>
            <div className="col-lg-6">
                <div className="mb-3">
                    <div className="skeleton-line sk-w-150 sk-h-20 mb-2"></div>
                    <div className="skeleton-line w-100 sk-h-40"></div>
                    <div className="skeleton-line sk-w-200 sk-h-12 mt-1"></div>
                </div>
            </div>

            {/* DNS Info Alert Placeholder */}
            <div className="col-lg-12">
                <div className="skeleton-line sk-h-150 w-100 mb-4" style={{ borderRadius: '8px' }}></div>
            </div>

        </div>
    );
}
