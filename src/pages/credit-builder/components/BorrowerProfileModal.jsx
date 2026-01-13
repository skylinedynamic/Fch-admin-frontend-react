import React, { useEffect, useRef, useState } from 'react';
import Modal from 'bootstrap/js/dist/modal';
import { getBorrowerProfile } from '../../../modules/verification-center/services';

export default function BorrowerProfileModal({ show, onHide, borrowerId, profileData }) {
    const modalRef = useRef(null);
    const modalInstanceRef = useRef(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Initialize Bootstrap Modal
    useEffect(() => {
        if (!modalRef.current) return;
        if (!modalInstanceRef.current) {
            modalInstanceRef.current = new Modal(modalRef.current, {
                backdrop: 'static',
                keyboard: false,
            });
        }
    }, [modalRef]);

    // Show/hide logic
    useEffect(() => {
        const modal = modalInstanceRef.current;
        if (!modal) return;
        if (show) {
            modal.show();
            if (profileData) {
                setProfile(profileData);
                setLoading(false);
            } else if (borrowerId) {
                fetchProfile(borrowerId);
            }
        } else {
            modal.hide();
            // Don't clear profile immediately to prevent flickering during close animation
            // The data will be refreshed next time it opens
        }
    }, [show, borrowerId, profileData]);

    const fetchProfile = async (id) => {
        try {
            setLoading(true);
            setError(null);
            const response = await getBorrowerProfile(id);
            if (response.status && response.data) {
                setProfile(response.data);
            } else {
                setError(response.message || 'Failed to fetch profile data.');
            }
        } catch (err) {
            console.error(err);
            setError('An error occurred while fetching the profile.');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        if (onHide) onHide();
    };

    // Helper to render field if it exists
    const renderField = (label, value, isLink = false, width = "col-md-6") => {
        if (!value) return null;
        return (
            <div className={`${width} mb-2`}>
                <label className="form-label text-muted text-uppercase fw-medium fs-10 mb-0">{label}</label>
                {isLink ? (
                    <div><a href={value} target="_blank" rel="noreferrer" className="text-primary fw-medium">{value}</a></div>
                ) : (
                    <div className="text-dark fw-medium fs-13">{value}</div>
                )}
            </div>
        );
    };

    return (
        <div className="modal fade flip" ref={modalRef} tabIndex="-1" aria-hidden="true">
            <div className="modal-dialog modal-dialog-centered modal-xl">
                <div className="modal-content border-0 shadow-lg">
                    <div className="modal-header bg-light p-3">
                        <h5 className="modal-title" id="borrowerProfileLabel">Borrower Profile</h5>
                        <button type="button" className="btn-close" onClick={handleClose} aria-label="Close"></button>
                    </div>
                    <div className="modal-body p-4">
                        {loading ? (
                            <div className="text-center py-5">
                                <div className="spinner-border text-primary" role="status">
                                    <span className="visually-hidden">Loading...</span>
                                </div>
                                <p className="mt-2 text-muted">Loading profile...</p>
                            </div>
                        ) : error ? (
                            <div className="alert alert-danger" role="alert">
                                {error}
                            </div>
                        ) : profile ? (
                            <div>
                                {/* Header Section with Avatar */}
                                <div className="d-flex align-items-center mb-4 pb-4 border-bottom">
                                    <div className="avatar-lg rounded-circle bg-primary-subtle d-flex align-items-center justify-content-center me-3">
                                        <span className="fs-2 text-primary fw-bold">
                                            {profile.first_name ? profile.first_name.charAt(0).toUpperCase() : ''}
                                            {profile.last_name ? profile.last_name.charAt(0).toUpperCase() : ''}
                                        </span>
                                    </div>
                                    <div>
                                        <h4 className="mb-1">{profile.full_name}</h4>
                                        <p className="text-muted mb-0">{profile.email} | {profile.phone_number}</p>
                                        <div className="d-flex gap-2 mt-2">
                                            {profile.status && <span className="badge bg-success-subtle text-success">{profile.status}</span>}
                                            {profile.current_tier_name && <span className="badge bg-info-subtle text-info">{profile.current_tier_name}</span>}
                                        </div>
                                    </div>
                                </div>

                                { /* Content Grid */ }
                                <div className="row g-4">
                                    {/* Personal Information Column */}
                                    <div className="col-lg-6">
                                        <div className="card shadow-none border bg-light-subtle h-100 mb-0">
                                            <div className="card-header bg-transparent border-bottom-0 pb-1">
                                                <h6 className="card-title text-uppercase fw-bold text-primary fs-13 mb-0">
                                                    <i className="ri-user-smile-line me-2 align-middle"></i> Personal Information
                                                </h6>
                                            </div>
                                            <div className="card-body pt-2">
                                                <div className="d-flex flex-column gap-2">
                                                    {renderField("Full Name", profile.full_name, false, "col-12")}
                                                    {renderField("Date of Birth", profile.date_of_birth, false, "col-12")}
                                                    {renderField("Address", profile.home_address, false, "col-12")}
                                                    <div className="row g-2">
                                                        {renderField("City", profile.city, false, "col-6")}
                                                        {renderField("State", profile.state, false, "col-6")}
                                                        {renderField("Postal Code", profile.postal_code, false, "col-6")}
                                                        {renderField("Country", profile.country, false, "col-6")}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Business Information Column */}
                                    <div className="col-lg-6">
                                        <div className="card shadow-none border bg-light-subtle h-100 mb-0">
                                            <div className="card-header bg-transparent border-bottom-0 pb-1">
                                                <h6 className="card-title text-uppercase fw-bold text-primary fs-13 mb-0">
                                                    <i className="ri-briefcase-line me-2 align-middle"></i> Business Information
                                                </h6>
                                            </div>
                                            <div className="card-body pt-2">
                                                <div className="d-flex flex-column gap-2">
                                                    {renderField("Business Name", profile.business_name, false, "col-12")}
                                                    <div className="row g-2">
                                                        {renderField("Phone", profile.business_phone, false, "col-6")}
                                                        {renderField("EIN", profile.business_ein, false, "col-6")}
                                                    </div>
                                                    {renderField("Email", profile.business_email, false, "col-12")}
                                                    {renderField("Website", profile.business_website, true, "col-12")}
                                                    {renderField("Address", profile.business_address, false, "col-12")}
                                                    <div className="row g-2">
                                                        {renderField("City", profile.business_city, false, "col-6")}
                                                        {renderField("State", profile.business_state, false, "col-6")}
                                                        {renderField("Zip Code", profile.business_zip_code, false, "col-6")}
                                                        {renderField("DUNS Number", profile.duns_number, false, "col-6")}
                                                    </div>
                                                    <div className="row g-2">
                                                        {renderField("Entity Type", profile.business_entity_type, false, "col-6")}
                                                        {renderField("Industry", profile.business_industry_type, false, "col-6")}
                                                    </div>
                                                    <div className="row g-2">
                                                        {renderField("Monthly Rev", profile.monthly_revenue, false, "col-6")}
                                                        {renderField("Annual Rev", profile.annual_revenue, false, "col-6")}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center text-muted">No profile data available.</div>
                        )}
                    </div>
                    <div className="modal-footer bg-light p-2">
                        <button type="button" className="btn btn-light" onClick={handleClose}>Close</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
