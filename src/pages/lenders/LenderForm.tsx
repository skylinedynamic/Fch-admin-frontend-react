import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getLender, createLender, updateLender, getLenderProductCategories } from '../../modules/lender/services';
import { Lender } from '../../modules/lender/types';
import FormLoader from '../../components/Loader/FormLoader';
import { formatPhoneNumber } from '../../utils/formatters';
import { Dropdown } from 'primereact/dropdown';
import { Calendar } from 'primereact/calendar';
import { MultiSelect } from 'primereact/multiselect';
import { LENDER_STATUS } from '../../config/statusOptions';
import { PRODUCT_CATEGORIES, SUBMISSION_METHODS } from '../../config/lender';
import { useSummernote } from '../../hooks/useSummernote';
import LenderProductCategoryModal from './components/LenderProductCategoryModal';

export default function LenderForm() {
    const navigate = useNavigate();
    const { id } = useParams();
    const isEditMode = !!id;

    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(isEditMode);
    
    const [categoriesList, setCategoriesList] = useState<any[]>([]);
    const [showCategoryModal, setShowCategoryModal] = useState(false);

    const initialFormState: any = {
        name: '',
        legal_name: '',
        status: 'Active',
        iso_status: '',
        product_categories: [],
        contact_name: '',
        contact_title: '',
        contact_email: '',
        contact_phone: '',
        website: '',
        submission_method: '',
        submission_email: '',
        submission_portal_link: '',
        internal_notes: '',
        last_verified_date: ''
    };

    const [formData, setFormData] = useState<Lender>(initialFormState);
    const [errors, setErrors] = useState<any>({});

    const handleChange = (e: any) => {
        const { name, value } = e.target;
        setFormData((prev: any) => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors((prev: any) => ({ ...prev, [name]: null }));
        }
    };

    const { editorRef: internalNotesRef } = useSummernote('internal_notes', formData.internal_notes, handleChange);

    useEffect(() => {
        fetchCategories();
        if (isEditMode) {
            const fetchLender = async () => {
                try {
                    const res = await getLender(id!);
                    setFormData({
                        ...initialFormState,
                        ...res.data
                    });
                } catch (error) {
                    toast.error('Failed to load lender details');
                    navigate('/lenders');
                } finally {
                    setInitialLoading(false);
                }
            };
            fetchLender();
        }
    }, [id, isEditMode, navigate]);

    const fetchCategories = async () => {
        try {
            const res = await getLenderProductCategories();
            setCategoriesList(res.data || []);
        } catch (error) {
            console.error('Failed to fetch categories', error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        setLoading(true);
        try {
            // Clean up empty strings to undefined to not fail numeric validation
            const payload: any = { ...formData };
            Object.keys(payload).forEach(key => {
                if (payload[key] === '') {
                    payload[key] = null;
                }
            });

            if (isEditMode) {
                await updateLender(id!, payload);
                toast.success('Lender updated successfully');
            } else {
                await createLender(payload);
                toast.success('Lender created successfully');
            }
            navigate('/lenders');
        } catch (error: any) {
            console.error(error);
            if (error.response?.status === 422) {
                const backendErrors = error.response.data.errors || {};
                const mappedErrors: Record<string, string> = {};
                Object.keys(backendErrors).forEach(key => {
                    mappedErrors[key] = Array.isArray(backendErrors[key])
                        ? backendErrors[key][0]
                        : backendErrors[key];
                });
                setErrors(mappedErrors);
            } else {
                toast.error(error.response?.data?.message || 'Failed to save lender');
            }
        } finally {
            setLoading(false);
        }
    };

    const renderInput = (name: keyof Lender, label: string, type = 'text', placeholder = '', col = 'col-md-6', required = false) => {
        return (
            <div className={`mb-4 ${col}`}>
                <label className="form-label text-dark fw-medium mb-2">
                    {label} {required && <span className="text-danger">*</span>}
                </label>
                <input
                    type={type}
                    name={name}
                    className={`form-control rounded-3 py-2 ${errors[name] ? 'is-invalid' : ''}`}
                    value={formData[name] as string || ''}
                    onChange={handleChange}
                    placeholder={placeholder}
                />
                {errors[name] && <div className="invalid-feedback">{errors[name]}</div>}
            </div>
        );
    };

    const renderTextarea = (name: keyof Lender, label: string, col = 'col-12', rows = 3) => {
        return (
            <div className={`mb-4 ${col}`}>
                <label className="form-label text-dark fw-medium mb-2">{label}</label>
                <textarea
                    name={name}
                    rows={rows}
                    className={`form-control rounded-3 py-2 ${errors[name] ? 'is-invalid' : ''}`}
                    value={formData[name] as string || ''}
                    onChange={handleChange}
                ></textarea>
                {errors[name] && <div className="invalid-feedback">{errors[name]}</div>}
            </div>
        );
    };

    return (
        <div className="page-content">
            <div className="container-fluid">
                {/* Page Header */}
                <div className="row page-subheader-sticky bg-body">
                    <div className="col-12">
                        <div className="d-flex align-items-lg-center flex-lg-row flex-column py-2">
                            <div className="flex-grow-1">
                                <h4 className="fs-18 fw-semibold mb-1">{isEditMode ? 'Edit Lender' : 'Add Lender'}</h4>
                                <nav aria-label="breadcrumb">
                                    <ol className="breadcrumb m-0">
                                        <li className="breadcrumb-item"><Link to="/" className="text-muted">Dashboard</Link></li>
                                        <li className="breadcrumb-item"><Link to="/lenders" className="text-muted">Lenders</Link></li>
                                        <li className="breadcrumb-item active" aria-current="page">{isEditMode ? 'Edit' : 'Add'}</li>
                                    </ol>
                                </nav>
                            </div>
                            <div className="page-actions d-flex align-items-center gap-2 mt-3 mt-lg-0">
                                <button type="button" className="btn btn-outline-secondary w-lg waves-effect" onClick={() => navigate('/lenders')} disabled={loading}>
                                    <i className="ri-arrow-left-line align-middle me-1"></i> Back
                                </button>
                                <button type="button" className="btn btn-primary waves-effect" onClick={handleSubmit} disabled={loading || initialLoading}>
                                    {loading ? (
                                        <><span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span> Saving...</>
                                    ) : (
                                        <><i className="ri-save-line align-middle me-1"></i> Save Lender</>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="row">
                    <div className="col-12 mx-auto">
                        <div className="card shadow-sm">
                            <div className="card-body p-4">
                                {initialLoading ? (
                                    <FormLoader count={6} />
                                ) : (
                                    <form onSubmit={handleSubmit}>

                                        <h5 className="mb-3 border-bottom pb-2">Basic Information</h5>
                                        <div className="row">
                                            {renderInput('name', 'Lender Name', 'text', 'Enter lender name', 'col-md-6', true)}
                                            {renderInput('legal_name', 'Legal Name', 'text', 'Enter legal name', 'col-md-6', true)}

                                            <div className="mb-4 col-md-4">
                                                <div className="d-flex justify-content-between align-items-center mb-2">
                                                    <label className="form-label text-dark fw-medium mb-0">Product Categories <span className="text-danger">*</span></label>
                                                    <button type="button" className="btn btn-link p-0 text-decoration-none fs-13" onClick={() => setShowCategoryModal(true)}>Add New</button>
                                                </div>
                                                <MultiSelect
                                                    inputId="product_categories"
                                                    value={formData.product_categories || []}
                                                    options={categoriesList.length > 0 ? categoriesList.map(cat => ({ label: cat.name, value: cat.name })) : PRODUCT_CATEGORIES}
                                                    onChange={(e) => handleChange({ target: { name: 'product_categories', value: e.value } } as any)}
                                                    optionLabel="label"
                                                    optionValue="value"
                                                    placeholder="Select Categories"
                                                    className={`w-100 rounded-3 slim-multiselect ${errors.product_categories ? 'p-invalid' : ''}`}
                                                    appendTo="self"
                                                    display="chip"
                                                />
                                                {errors.product_categories && <small className="p-error">{errors.product_categories}</small>}
                                            </div>

                                            <div className="mb-4 col-md-4">
                                                <label className="form-label text-dark fw-medium mb-2">ISO Status</label>
                                                <Dropdown
                                                    inputId="iso_status"
                                                    value={formData.iso_status}
                                                    options={LENDER_STATUS}
                                                    onChange={(e) => handleChange({ target: { name: 'iso_status', value: e.value } } as any)}
                                                    optionLabel="label"
                                                    optionValue="value"
                                                    placeholder="Select ISO Status"
                                                    className={`w-100 rounded-3 slim-dropdown ${errors.iso_status ? 'p-invalid' : ''}`}
                                                    appendTo="self"
                                                />
                                                {errors.iso_status && <small className="p-error">{errors.iso_status}</small>}
                                            </div>

                                            <div className="mb-4 col-md-4">
                                                <label className="form-label text-dark fw-medium mb-2">Status <span className="text-danger">*</span></label>
                                                <Dropdown
                                                    inputId="status"
                                                    value={formData.status}
                                                    options={LENDER_STATUS}
                                                    onChange={(e) => handleChange({ target: { name: 'status', value: e.value } } as any)}
                                                    optionLabel="label"
                                                    optionValue="value"
                                                    placeholder="Select Status"
                                                    className={`w-100 rounded-3 slim-dropdown ${errors.status ? 'p-invalid' : ''}`}
                                                    appendTo="self"
                                                />
                                                {errors.status && <small className="p-error">{errors.status}</small>}
                                            </div>
                                        </div>

                                        <h5 className="mb-3 mt-4 border-bottom pb-2">Contact Information</h5>
                                        <div className="row">
                                            <div className="mb-4 col-md-6">
                                                <label className="form-label text-dark fw-medium mb-2">Contact Name <span className="text-danger">*</span></label>
                                                <input
                                                    type="text"
                                                    name="contact_name"
                                                    className={`form-control rounded-3 py-2 ${errors.contact_name ? 'is-invalid' : ''}`}
                                                    value={formData.contact_name || ''}
                                                    onChange={handleChange}
                                                    placeholder="Enter contact name"
                                                />
                                                {errors.contact_name && <div className="invalid-feedback">{errors.contact_name}</div>}
                                            </div>
                                            <div className="mb-4 col-md-6">
                                                <label className="form-label text-dark fw-medium mb-2">Contact Title <span className="text-danger">*</span></label>
                                                <input
                                                    type="text"
                                                    name="contact_title"
                                                    className={`form-control rounded-3 py-2 ${errors.contact_title ? 'is-invalid' : ''}`}
                                                    value={formData.contact_title || ''}
                                                    onChange={handleChange}
                                                    placeholder="Enter contact title"
                                                />
                                                {errors.contact_title && <div className="invalid-feedback">{errors.contact_title}</div>}
                                            </div>

                                            <div className="mb-4 col-md-4">
                                                <label className="form-label text-dark fw-medium mb-2">Contact Phone <span className="text-danger">*</span></label>
                                                <div className="input-group">
                                                    <span className="input-group-text bg-light border">
                                                        <span className="text-muted">+1</span>
                                                    </span>
                                                    <input
                                                        type="text"
                                                        name="contact_phone"
                                                        className={`form-control rounded-3 py-2 ${errors.contact_phone ? 'is-invalid' : ''}`}
                                                        value={formData.contact_phone || ''}
                                                        onChange={(e) => {
                                                            const formatted = formatPhoneNumber(e.target.value);
                                                            handleChange({ target: { name: 'contact_phone', value: formatted } } as any);
                                                        }}
                                                        placeholder="(xxx) xxx-xxxx"
                                                    />
                                                    {errors.contact_phone && <div className="invalid-feedback">{errors.contact_phone}</div>}
                                                </div>
                                            </div>
                                            <div className="mb-4 col-md-4">
                                                <label className="form-label text-dark fw-medium mb-2">Contact Email <span className="text-danger">*</span></label>
                                                <input
                                                    type="email"
                                                    name="contact_email"
                                                    className={`form-control rounded-3 py-2 ${errors.contact_email ? 'is-invalid' : ''}`}
                                                    value={formData.contact_email || ''}
                                                    onChange={handleChange}
                                                    placeholder="Enter email address"
                                                />
                                                {errors.contact_email && <div className="invalid-feedback">{errors.contact_email}</div>}
                                            </div>
                                            <div className="mb-4 col-md-4">
                                                <label className="form-label text-dark fw-medium mb-2">Website</label>
                                                <input
                                                    type="text"
                                                    name="website"
                                                    className={`form-control rounded-3 py-2 ${errors.website ? 'is-invalid' : ''}`}
                                                    value={formData.website || ''}
                                                    onChange={handleChange}
                                                    placeholder="https://..."
                                                />
                                                {errors.website && <div className="invalid-feedback">{errors.website}</div>}
                                            </div>
                                        </div>

                                        <h5 className="mb-3 mt-4 border-bottom pb-2">Submission Details</h5>
                                        <div className="row">
                                            <div className="mb-4 col-md-6">
                                                <label className="form-label text-dark fw-medium mb-2">Submission Method</label>
                                                <Dropdown
                                                    inputId="submission_method"
                                                    value={formData.submission_method}
                                                    options={SUBMISSION_METHODS}
                                                    onChange={(e) => handleChange({ target: { name: 'submission_method', value: e.value } } as any)}
                                                    optionLabel="label"
                                                    optionValue="value"
                                                    placeholder="Select Method"
                                                    className={`w-100 ${errors.submission_method ? 'p-invalid' : ''}`}
                                                    appendTo="self"
                                                />
                                                {errors.submission_method && <small className="p-error">{errors.submission_method}</small>}
                                            </div>
                                            <div className="mb-4 col-md-6">
                                                <label className="form-label text-dark fw-medium mb-2">Submission Email</label>
                                                <input
                                                    type="email"
                                                    name="submission_email"
                                                    className={`form-control rounded-3 py-2 ${errors.submission_email ? 'is-invalid' : ''}`}
                                                    value={formData.submission_email || ''}
                                                    onChange={handleChange}
                                                    placeholder="Enter submission email"
                                                />
                                                {errors.submission_email && <div className="invalid-feedback">{errors.submission_email}</div>}
                                            </div>

                                            <div className="mb-4 col-md-6">
                                                <label className="form-label text-dark fw-medium mb-2">Submission Portal URL</label>
                                                <input
                                                    type="url"
                                                    name="submission_portal_link"
                                                    className={`form-control rounded-3 py-2 ${errors.submission_portal_link ? 'is-invalid' : ''}`}
                                                    value={formData.submission_portal_link || ''}
                                                    onChange={handleChange}
                                                    placeholder="https://..."
                                                />
                                                {errors.submission_portal_link && <div className="invalid-feedback">{errors.submission_portal_link}</div>}
                                            </div>

                                            <div className="mb-4 col-md-6">
                                                <label className="form-label text-dark fw-medium mb-2">Last Verified Date <span className="text-danger">*</span></label>
                                                <div className="custom-datepicker">
                                                    <Calendar
                                                        id="last_verified_date"
                                                        value={formData.last_verified_date ? new Date(formData.last_verified_date) : null}
                                                        onChange={(e) => {
                                                            const date = e.value as Date;
                                                            const dateString = date
                                                                ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
                                                                : "";
                                                            handleChange({ target: { name: 'last_verified_date', value: dateString } } as any);
                                                        }}
                                                        dateFormat="dd M, yy"
                                                        placeholder="Select date"
                                                        showIcon
                                                        className="w-100"
                                                        appendTo="self"
                                                        readOnlyInput
                                                        maxDate={new Date()}
                                                    />
                                                </div>
                                                {errors.last_verified_date && <small className="p-error">{errors.last_verified_date}</small>}
                                            </div>

                                            <div className="mb-4 col-md-12">
                                                <label className="form-label text-dark fw-medium mb-2">Internal Notes</label>
                                                <div className={errors.internal_notes ? 'summernote-error-wrapper' : ''}>
                                                    <textarea ref={internalNotesRef}></textarea>
                                                </div>
                                                {errors.internal_notes && <div className="invalid-feedback d-block">{errors.internal_notes}</div>}
                                            </div>
                                        </div>
                                    </form>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Product Category Modal */}
            <LenderProductCategoryModal
                visible={showCategoryModal}
                onHide={() => setShowCategoryModal(false)}
                onSuccess={() => fetchCategories()}
                categories={categoriesList}
            />
        </div>
    );
}
