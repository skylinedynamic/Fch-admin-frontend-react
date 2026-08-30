import React from 'react';
import { ENTITY_TYPE_PARTNER, ENTITY_TYPE_BORROWER } from '../../config/appConfig';

export default function LeadConvertSkeleton({ targetType = 'Borrower', isHost = true }) {
    return (
        <div className="fade-panel shadow-none border-0 pt-2">
            <div className="text-center">
                {/* Icon Placeholder */}
                <div className="d-flex justify-content-center mb-3">
                    <div
                        className={`skeleton-line sk-w-80 sk-h-80 sk-rounded-circle ${targetType === ENTITY_TYPE_PARTNER ? 'bg-success bg-opacity-10 border border-success border-opacity-10' : ''}`}
                    ></div>
                </div>

                {/* Title and Description */}
                <div className="mx-auto mb-2">
                    <div className="skeleton-line sk-w-60p sk-h-24"></div>
                </div>
                <div className="mx-auto mb-4">
                    <div className="skeleton-line mb-2 sk-w-90p sk-h-14"></div>
                    <div className="skeleton-line sk-w-70p sk-h-14"></div>
                </div>

                {/* dynamic fields section */}
                <div className="mb-4 text-start">
                    {targetType === ENTITY_TYPE_BORROWER ? (
                        <>
                            {isHost && (
                                <div className="mb-3">
                                    <div className="skeleton-line mb-2 sk-w-150 sk-h-14"></div>
                                    <div className="skeleton-line w-100 sk-h-38 sk-rounded-6"></div>
                                </div>
                            )}

                            {/* Info Box Skeleton */}
                            <div className="bg-success bg-opacity-10 p-4 rounded-2 border-success border-opacity-10 d-flex align-items-center">
                                <div className="flex-shrink-0 me-3">
                                    <div className="bg-white p-3 rounded-3 shadow-sm d-flex align-items-center justify-content-center sk-w-80 sk-h-80">
                                        <div className="skeleton-line sk-w-48 sk-h-48 sk-rounded-8"></div>
                                    </div>
                                </div>
                                <div className="flex-grow-1 ps-2">
                                    <div className="skeleton-line mb-2 sk-w-180 sk-h-18"></div>
                                    <div className="skeleton-line w-100 sk-h-14"></div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            {/* Partner Type Dropdown */}
                            <div className="mb-3">
                                <div className="skeleton-line mb-2 sk-w-150 sk-h-14"></div>
                                <div className="skeleton-line w-100 sk-h-38 sk-rounded-6"></div>
                            </div>
                            {/* Enrollment Type Dropdown */}
                            <div className="mb-3">
                                <div className="skeleton-line mb-2 sk-w-150 sk-h-14"></div>
                                <div className="skeleton-line w-100 sk-h-38 sk-rounded-6"></div>
                            </div>
                        </>
                    )}
                </div>

                {/* Action Buttons */}
                <div className="hstack gap-2 justify-content-center mt-4">
                    <div className="skeleton-line sk-w-100 sk-h-38 sk-rounded-6"></div>
                    <div
                        className={`skeleton-line sk-w-160 sk-h-38 sk-rounded-6 ${targetType === ENTITY_TYPE_PARTNER ? 'bg-success bg-opacity-25' : ''}`}
                    ></div>
                </div>
            </div>
        </div>
    );
}
