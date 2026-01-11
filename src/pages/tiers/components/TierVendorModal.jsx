import React, { useEffect, useState, useRef } from 'react';
import Modal from 'bootstrap/js/dist/modal';
import { Chips } from 'primereact/chips';
import { Dropdown } from 'primereact/dropdown';
import { MultiSelect } from 'primereact/multiselect';

import { CATEGORY_OPTIONS, STATUS_OPTIONS, REPORT_TO_OPTIONS } from '../../../config';

const TierVendorModal = ({
    show,
    onHide,
    onSubmit,
    vendor,
    tierId,
    loadingSave,
    serverErrors
}) => {
    const isEdit = !!vendor;
    const modalRef = useRef(null);
    const modalInstanceRef = useRef(null);

    const [formData, setFormData] = useState({
        name: '',
        category: null,
        requirements: [],
        benefits: [],
        report_to: [],
        status: 'Active'
    });
    const [errors, setErrors] = useState({});

    // Handle Server Errors
    useEffect(() => {
        if (serverErrors && Object.keys(serverErrors).length > 0) {
            const newErrors = {};
            Object.keys(serverErrors).forEach(key => {
                // Take the first error message for each field
                newErrors[key] = Array.isArray(serverErrors[key]) ? serverErrors[key][0] : serverErrors[key];
            });
            setErrors(newErrors);
        }
    }, [serverErrors]);

    // Initialize Bootstrap Modal
    useEffect(() => {
        if (modalRef.current && !modalInstanceRef.current) {
            modalInstanceRef.current = new Modal(modalRef.current, {
                backdrop: 'static',
                keyboard: false
            });
        }
    }, []);

    // Show/Hide Modal based on prop
    useEffect(() => {
        if (modalInstanceRef.current) {
            if (show) {
                modalInstanceRef.current.show();
            } else {
                modalInstanceRef.current.hide();
            }
        }
    }, [show]);

    // Update form data when vendor or show changes
    useEffect(() => {
        if (show) {
            if (vendor) {
                setFormData({
                    name: vendor.name || '',
                    category: vendor.category || null,
                    requirements: vendor.requirements || [],
                    benefits: vendor.benefits || [],
                    report_to: vendor.report_to || [],
                    status: vendor.status || 'Active'
                });
            } else {
                setFormData({
                    name: '',
                    category: null,
                    requirements: [],
                    benefits: [],
                    report_to: [],
                    status: 'Active'
                });
            }
            setErrors({});
        }
    }, [show, vendor]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: null }));
        }
    };

    const handleChipsChange = (name, value) => {
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit({
            ...formData,
            tier_id: tierId
        });
    };

    return (
        <div
            className="modal fade flip tier-vendor-modal"
            ref={modalRef}
            tabIndex="-1"
            aria-hidden="true"
        >
            <div className="modal-dialog modal-dialog-centered modal-lg">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title">{isEdit ? 'Edit Vendor' : 'Add New Vendor'}</h5>
                        <button type="button" className="btn-close" onClick={onHide}></button>
                    </div>
                    <div className="modal-body">
                        <form onSubmit={handleSubmit}>
                            <div className="row g-3">
                                <div className="col-md-6">
                                    <label className="form-label">Name <span className="text-danger">*</span></label>
                                    <input
                                        type="text"
                                        name="name"
                                        className={`form-control ${errors.name ? 'is-invalid' : ''}`}
                                        value={formData.name}
                                        onChange={handleChange}
                                        placeholder="Enter vendor name"
                                    />
                                    {errors.name && <div className="invalid-feedback">{errors.name}</div>}
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label">Category <span className="text-danger">*</span></label>
                                    <Dropdown
                                        value={formData.category}
                                        options={CATEGORY_OPTIONS}
                                        onChange={(e) => {
                                            setFormData(prev => ({ ...prev, category: e.value }));
                                            if (errors.category) setErrors(prev => ({ ...prev, category: null }));
                                        }}
                                        optionLabel="label"
                                        placeholder="Select a Category"
                                        className={`w-100 ${errors.category ? 'p-invalid' : ''}`}
                                        appendTo="self"
                                    />
                                    {errors.category && <div className="invalid-feedback d-block">{errors.category}</div>}
                                </div>

                                <div className="col-md-6">
                                    <label className="form-label">Requirements</label>
                                    <Chips
                                        value={formData.requirements}
                                        onChange={(e) => handleChipsChange('requirements', e.value)}
                                        className="w-100"
                                        separator=","
                                        placeholder="Type and press enter"
                                    />
                                </div>

                                <div className="col-md-6">
                                    <label className="form-label">Benefits</label>
                                    <Chips
                                        value={formData.benefits}
                                        onChange={(e) => handleChipsChange('benefits', e.value)}
                                        className="w-100"
                                        separator=","
                                        placeholder="Type and press enter"
                                    />
                                </div>

                                <div className="col-md-12">
                                    <label className="form-label d-block">Report To</label>
                                    <div className="d-flex flex-wrap gap-3">
                                        {REPORT_TO_OPTIONS.map((option) => (
                                            <div key={option.value} className="form-check">
                                                <input
                                                    className="form-check-input"
                                                    type="checkbox"
                                                    id={`report_${option.value}`}
                                                    value={option.value}
                                                    checked={formData.report_to.includes(option.value)}
                                                    onChange={(e) => {
                                                        const checked = e.target.checked;
                                                        const value = option.value;
                                                        setFormData(prev => {
                                                            const current = prev.report_to || [];
                                                            if (checked) {
                                                                return { ...prev, report_to: [...current, value] };
                                                            } else {
                                                                return { ...prev, report_to: current.filter(item => item !== value) };
                                                            }
                                                        });
                                                    }}
                                                />
                                                <label className="form-check-label" htmlFor={`report_${option.value}`}>
                                                    {option.label}
                                                </label>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="col-md-6">
                                    <label className="form-label">Status</label>
                                    <Dropdown
                                        value={formData.status}
                                        options={STATUS_OPTIONS}
                                        onChange={(e) => setFormData(prev => ({ ...prev, status: e.value }))}
                                        optionLabel="label"
                                        className="w-100"
                                        appendTo="self"
                                    />
                                </div>
                            </div>

                            <div className="d-flex justify-content-end mt-4 pt-2 border-top">
                                <button type="button" className="btn btn-light me-2" onClick={onHide}>Cancel</button>
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={loadingSave}
                                >
                                    {loadingSave ? (
                                        <>
                                            <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <i className={`me-1 align-bottom ${isEdit ? 'ri-edit-2-fill' : 'ri-save-3-fill'}`}></i>
                                            {isEdit ? 'Update' : 'Save'}
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TierVendorModal;
