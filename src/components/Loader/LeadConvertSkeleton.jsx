import React from 'react';

export default function LeadConvertSkeleton({ targetType = 'Borrower', isHost = true }) {
    return (
        <div className="fade-panel shadow-none border-0 pt-2">
            <div className="text-center">
                {/* Icon Placeholder */}
                <div className="d-flex justify-content-center mb-3">
                    <div
                        className={`skeleton-line ${targetType === 'Partner' ? 'bg-success bg-opacity-10 border border-success border-opacity-10' : ''}`}
                        style={{ width: '80px', height: '80px', borderRadius: '50%' }}
                    ></div>
                </div>

                {/* Title and Description */}
                <div className="mx-auto mb-2">
                    <div className="skeleton-line" style={{ width: '60%', height: '24px' }}></div>
                </div>
                <div className="mx-auto mb-4">
                    <div className="skeleton-line mb-2" style={{ width: '90%', height: '14px' }}></div>
                    <div className="skeleton-line" style={{ width: '70%', height: '14px' }}></div>
                </div>

                {/* dynamic fields section */}
                <div className="mb-4 text-start">
                    {targetType === 'Borrower' ? (
                        <>
                            {isHost && (
                                <div className="mb-3">
                                    <div className="skeleton-line mb-2" style={{ width: '150px', height: '14px' }}></div>
                                    <div className="skeleton-line w-100" style={{ height: '38px', borderRadius: '6px' }}></div>
                                </div>
                            )}

                            {/* Info Box Skeleton */}
                            <div className="bg-success bg-opacity-10 p-4 rounded-4 border border-success border-opacity-10 d-flex align-items-center">
                                <div className="flex-shrink-0 me-3">
                                    <div className="bg-white p-3 rounded-3 shadow-sm d-flex align-items-center justify-content-center" style={{ width: '80px', height: '80px' }}>
                                        <div className="skeleton-line" style={{ width: '48px', height: '48px', borderRadius: '8px' }}></div>
                                    </div>
                                </div>
                                <div className="flex-grow-1 ps-2">
                                    <div className="skeleton-line mb-2" style={{ width: '180px', height: '18px' }}></div>
                                    <div className="skeleton-line" style={{ width: '100%', height: '14px' }}></div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            {/* Partner Type Dropdown */}
                            <div className="mb-3">
                                <div className="skeleton-line mb-2" style={{ width: '150px', height: '14px' }}></div>
                                <div className="skeleton-line w-100" style={{ height: '38px', borderRadius: '6px' }}></div>
                            </div>
                            {/* Enrollment Type Dropdown */}
                            <div className="mb-3">
                                <div className="skeleton-line mb-2" style={{ width: '150px', height: '14px' }}></div>
                                <div className="skeleton-line w-100" style={{ height: '38px', borderRadius: '6px' }}></div>
                            </div>
                        </>
                    )}
                </div>

                {/* Action Buttons */}
                <div className="hstack gap-2 justify-content-center mt-4">
                    <div className="skeleton-line" style={{ width: '100px', height: '38px', borderRadius: '6px' }}></div>
                    <div
                        className={`skeleton-line ${targetType === 'Partner' ? 'bg-success bg-opacity-25' : ''}`}
                        style={{ width: '160px', height: '38px', borderRadius: '6px' }}
                    ></div>
                </div>
            </div>
        </div>
    );
}
