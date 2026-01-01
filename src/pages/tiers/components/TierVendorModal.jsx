import React, { useEffect, useState, useRef } from 'react';
import Modal from 'bootstrap/js/dist/modal';
import { Chips } from 'primereact/chips';
import { Dropdown } from 'primereact/dropdown';

const CATEGORY_OPTIONS = [
    { label: 'Financial', value: 'Financial' },
    { label: 'Supplies', value: 'Supplies' },
    { label: 'Services', value: 'Services' },
    { label: 'Logistics', value: 'Logistics' },
    { label: 'IT', value: 'IT' }
];

const STATUS_OPTIONS = [
    { label: 'Active', value: 'Active' },
    { label: 'Inactive', value: 'Inactive' }
];

const TierVendorModal = ({
    show,
    onHide,
    onSubmit,
    vendor,
    tierId,
    loadingSave
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

    const validate = () => {
        let tempErrors = {};
        let isValid = true;
        if (!formData.name) {
            tempErrors.name = "Name is required";
            isValid = false;
        }
        if (!formData.category) {
            tempErrors.category = "Category is required";
            isValid = false;
        }
        setErrors(tempErrors);
        return isValid;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (validate()) {
            onSubmit({
                ...formData,
                tier_id: tierId
            });
        }
    };

    return (
        <div
            className="modal fade flip"
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
                                    <label className="form-label">Report To</label>
                                    <Chips
                                        value={formData.report_to}
                                        onChange={(e) => handleChipsChange('report_to', e.value)}
                                        className="w-100"
                                        separator=","
                                        placeholder="Type and press enter"
                                    />
                                </div>

                                <div className="col-md-12">
                                    <label className="form-label">Status</label>
                                    <Dropdown
                                        value={formData.status}
                                        options={STATUS_OPTIONS}
                                        onChange={(e) => setFormData(prev => ({ ...prev, status: e.value }))}
                                        optionLabel="label"
                                        className="w-100"
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
