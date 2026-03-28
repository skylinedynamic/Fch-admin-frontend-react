import React from 'react';
import { toast } from 'react-toastify';
import { downloadAgreementSign } from '../../../modules/agreement/services';

const AgreementSection = ({ partnerId, formData }) => {
    const handleDownload = async () => {
        const userId = formData.user_id || formData.id;
        window.open(`/partners/download-agreement/${userId}`, '_blank');
    };

    return (
        <div className="agreement-section py-4 text-center">
            <div className="mb-4 d-flex justify-content-center">
                <div className="avatar-xl">
                    <div className="avatar-title bg-light text-primary rounded-circle display-4">
                        <i className="ri-file-search-fill"></i>
                    </div>
                </div>
            </div>
            <h4 className="mb-2">Signed Agreement Workspace</h4>
            <p className="text-muted mb-4 mx-auto" style={{ maxWidth: '500px' }}>
                This partner has officially signed the legal agreement. You can launch the high-fidelity workspace to preview the signed document and download a secure PDF for your records.
            </p>
            <button
                className="btn btn-primary d-inline-flex align-items-center gap-2 px-5 py-2 fw-bold shadow-sm"
                onClick={handleDownload}
            >
                <i className="ri-external-link-line fs-18"></i> Launch Document Preview
            </button>
        </div>
    );
};

export default AgreementSection;
