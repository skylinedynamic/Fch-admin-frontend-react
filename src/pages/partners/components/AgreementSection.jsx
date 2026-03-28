import React from 'react';
import { toast } from 'react-toastify';
import { downloadAgreementSign } from '../../../modules/agreement/services';
import '../../../../assets/css/agreement-builder.css';

const AgreementSection = ({ partnerId, formData }) => {
    const handleDownload = async () => {
        const userId = formData.user_id || formData.id;
        window.open(`/partners/download-agreement/${userId}`, '_blank');
    };

    return (
        <div className="agreement-section mt-3">
            <div className="card border shadow-none mb-0">
                <div className="card-body p-4">
                    <div className="d-sm-flex align-items-center">
                        {/* Icon/Logo Side */}
                        <div className="flex-shrink-0 me-4 mb-3 mb-sm-0">
                            <div className="as-icon-wrapper">
                                <i className="ri-file-pdf-2-line as-icon"></i>
                            </div>
                        </div>

                        {/* Content Side */}
                        <div className="flex-grow-1">
                            <h5 className="fw-bold mb-1 as-title">Your Signed Agreement</h5>
                            <p className="text-muted mb-3 fs-14">A secure digital copy of the agreement you signed.</p>

                            <div className="d-flex flex-wrap gap-2 align-items-center mt-2">
                                <span className="badge rounded-pill bg-success-subtle text-success border border-success px-3 py-2 fs-12">
                                    <i className="ri-shield-check-line me-1"></i> Verified Document
                                </span>
                                <span className="badge rounded-pill bg-info-subtle text-info border border-info px-3 py-2 fs-12">
                                    <i className="ri-checkbox-circle-line me-1"></i> Signed Online
                                </span>
                            </div>
                        </div>

                        {/* Button Side */}
                        <div className="ms-sm-auto mt-4 mt-sm-0">
                            <button
                                className="as-btn"
                                onClick={handleDownload}
                            >
                                <i className="ri-external-link-line"></i> View Agreement
                            </button>
                        </div>
                    </div>
                </div>

                <div className="card-footer bg-light-subtle border-top py-3">
                    <p className="text-muted mb-0 fs-13">
                        <i className="ri-lock-2-line me-2 align-bottom"></i>
                        This agreement is officially verified and cannot be changed.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default AgreementSection;
