import React, { useState } from 'react';
import { toast } from 'react-toastify';
import ConfirmationModal from '../../../components/Common/Modals/ConfirmationModal';
import { downloadAgreementSign, cancelAgreementSign } from '../../../modules/agreement/services';
import "../../../../public/assets/css/agreement-builder.css";

const AgreementSection = ({ partnerId, clientId, formData, onRefresh }) => {
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [cancelling, setCancelling] = useState(false);
    const handleDownload = async () => {
        const userId = formData.user_id || formData.id;
        const prefix = clientId ? 'borrowers' : 'partners';
        window.open(`/${prefix}/download-agreement/${userId}`, '_blank');
    };

    const handleCancel = async () => {
        setCancelling(true);
        try {
            const userId = formData.user_id || formData.id;
            await cancelAgreementSign(userId);
            toast.success('Agreement cancelled successfully');
            setShowCancelModal(false);
            if (onRefresh) {
                onRefresh();
            }
        } catch (err) {
            toast.error('Failed to cancel agreement');
        } finally {
            setCancelling(false);
        }
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

                                <button
                                    className="btn badge rounded-pill bg-danger-subtle text-danger border border-danger px-3 py-2 fs-12 ms-2"
                                    onClick={() => setShowCancelModal(true)}
                                >
                                    <i className="ri-delete-bin-line me-1"></i> Cancel Agreement
                                </button>
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

            <ConfirmationModal
                show={showCancelModal}
                onHide={() => setShowCancelModal(false)}
                onConfirm={handleCancel}
                loading={cancelling}
                title="Cancel Signed Agreement"
                message="Are you sure you want to cancel this signed agreement? This action will revoke the signature status for this user and cannot be undone."
                confirmText="Yes, Cancel It"
                variant="danger"
            />
        </div>
    );
};

export default AgreementSection;
