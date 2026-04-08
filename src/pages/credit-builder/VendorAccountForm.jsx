import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import FormLoader from '../../components/Loader/FormLoader';
import { createVendorAccount, updateVendorAccount, getVendorAccount } from '../../modules/vendor-accounts/services';

export default function VendorAccountForm() {
    const navigate = useNavigate();
    const { id } = useParams();
    const isEditMode = !!id;

    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(isEditMode);
    const [formData, setFormData] = useState({
        card_name: '',
        issuer: '',
        credit_category: '',
        difficulty_rank: '',
        difficulty_tier: '',
        engine_eligibility_band: '',
        approval_level: '',
        typical_personal_fico_min: '',
        typical_personal_fico_ideal: '',
        time_in_business_min_months: '',
        revenue_expectation: '',
        business_credit_required: 'No',
        pg_required: 'No',
        cash_based: '',
        velocity_sensitive: '',
        relationship_required: 'No',
        internal_notes: '',
        portal_tier_unlock: '',
        borrower_exposure: '',
        sequencing_priority: '',
        image_url: '',
        reference_url: '',
        status: 'Active'
    });

    useEffect(() => {
        if (isEditMode) {
            const loadAccount = async () => {
                try {
                    const response = await getVendorAccount(id);
                    const data = response.data || response;
                    setFormData({
                        ...data,
                        difficulty_rank: data.difficulty_rank || '',
                        typical_personal_fico_min: data.typical_personal_fico_min || '',
                        typical_personal_fico_ideal: data.typical_personal_fico_ideal || '',
                        time_in_business_min_months: data.time_in_business_min_months || '',
                        status: data.status || 'Active'
                    });
                } catch (err) {
                    toast.error('Failed to load account details');
                    navigate('/vendor-accounts');
                } finally {
                    setInitialLoading(false);
                }
            };
            loadAccount();
        }
    }, [id, isEditMode, navigate]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        setLoading(true);
        try {
            if (isEditMode) {
                await updateVendorAccount(id, formData);
                toast.success('Account updated successfully');
            } else {
                await createVendorAccount(formData);
                toast.success('Account created successfully');
            }
            navigate('/vendor-accounts');
        } catch (err) {
            console.error(err);
            const errorMsg = err.response?.data?.message || 'Failed to save account';
            toast.error(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    if (initialLoading) {
        return (
            <div className="page-content">
                <div className="container-fluid">
                    <FormLoader count={6} />
                </div>
            </div>
        );
    }

    return (
        <div className="page-content">
            <div className="container-fluid">
                <div className="row pb-1 page-subheader-sticky bg-body">
                    <div className="col-12">
                        <div className="d-flex align-items-lg-center flex-lg-row flex-column py-2">
                            <div className="flex-grow-1">
                                <h4 className="fs-20 mb-1">{isEditMode ? 'Edit Vendor Account' : 'Add Vendor Account'}</h4>
                                <nav aria-label="breadcrumb">
                                    <ol className="breadcrumb m-0">
                                        <li className="breadcrumb-item"><Link to="/">Dashboard</Link></li>
                                        <li className="breadcrumb-item">Credit Builder</li>
                                        <li className="breadcrumb-item active">{isEditMode ? 'Edit' : 'Add'}</li>
                                    </ol>
                                </nav>
                            </div>
                            <div className="mt-3 mt-lg-0">
                                <Link to="/vendor-accounts" className="btn btn-outline-secondary w-lg waves-effect me-2">
                                    <i className="ri-arrow-left-line align-middle me-1"></i> Back
                                </Link>
                                <button type="submit" form="vendor-account-form" className="btn btn-primary w-lg waves-effect" disabled={loading}>
                                    {loading ? <span className="spinner-border spinner-border-sm me-1"></span> : <i className="ri-save-3-line align-middle me-1"></i>}
                                    {isEditMode ? 'Update' : 'Save'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="row">
                    <div className="col-12">
                        <div className="card border">
                            <div className="card-body p-4">
                                <form id="vendor-account-form" onSubmit={handleSubmit}>
                                    <div className="row g-3">
                                        {/* Row 1: Logo and Card Info */}
                                        <div className="col-md-6 text-center border-end pe-4 d-flex flex-column align-items-center justify-content-center">
                                            <div className="mb-3">
                                                <label className="form-label d-block text-start w-100">Card Image URL</label>
                                                <input type="text" name="image_url" className="form-control" value={formData.image_url} onChange={handleChange} placeholder="e.g. vendor-applications/filename.png" />
                                            </div>
                                            <div className="p-3 bg-light rounded" style={{ minWidth: '200px', minHeight: '120px' }}>
                                                {formData.full_image_url || formData.image_url ? (
                                                    <img 
                                                        src={formData.full_image_url || (formData.image_url.startsWith('http') ? formData.image_url : `/storage/${formData.image_url.replace(/ /g, '%20')}`)} 
                                                        alt="Preview" 
                                                        style={{ maxWidth: '100%', maxHeight: '150px', objectFit: 'contain' }} 
                                                    />
                                                ) : (
                                                    <div className="text-muted small py-4">Image Preview Will Appear Here</div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="col-md-6 ps-4">
                                            <div className="row g-3">
                                                <div className="col-12">
                                                    <label className="form-label">Card Name <span className="text-danger">*</span></label>
                                                    <input type="text" name="card_name" className="form-control" value={formData.card_name} onChange={handleChange} required />
                                                </div>
                                                <div className="col-12">
                                                    <label className="form-label">Issuer <span className="text-danger">*</span></label>
                                                    <input type="text" name="issuer" className="form-control" value={formData.issuer} onChange={handleChange} required />
                                                </div>
                                                <div className="col-12">
                                                    <label className="form-label">Reference URL (Link)</label>
                                                    <input type="text" name="reference_url" className="form-control" value={formData.reference_url} onChange={handleChange} placeholder="https://..." />
                                                </div>
                                            </div>
                                        </div>

                                        <hr className="my-4" />

                                        {/* Details Grid */}
                                        <div className="col-md-3">
                                            <label className="form-label">FICO Min</label>
                                            <input type="number" name="typical_personal_fico_min" className="form-control" value={formData.typical_personal_fico_min} onChange={handleChange} />
                                        </div>
                                        <div className="col-md-3">
                                            <label className="form-label">FICO Ideal</label>
                                            <input type="number" name="typical_personal_fico_ideal" className="form-control" value={formData.typical_personal_fico_ideal} onChange={handleChange} />
                                        </div>
                                        <div className="col-md-3">
                                            <label className="form-label">Biz Min Months</label>
                                            <input type="number" name="time_in_business_min_months" className="form-control" value={formData.time_in_business_min_months} onChange={handleChange} />
                                        </div>
                                        <div className="col-md-3">
                                            <label className="form-label">Approval Level</label>
                                            <input type="text" name="approval_level" className="form-control" value={formData.approval_level} onChange={handleChange} />
                                        </div>

                                        <div className="col-md-3">
                                            <label className="form-label">Difficulty Rank</label>
                                            <input type="number" name="difficulty_rank" className="form-control" value={formData.difficulty_rank} onChange={handleChange} />
                                        </div>
                                        <div className="col-md-3">
                                            <label className="form-label">Difficulty Tier</label>
                                            <input type="text" name="difficulty_tier" className="form-control" value={formData.difficulty_tier} onChange={handleChange} />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label">Credit Category</label>
                                            <input type="text" name="credit_category" className="form-control" value={formData.credit_category} onChange={handleChange} />
                                        </div>

                                        <div className="col-md-4">
                                            <label className="form-label">Business Credit Req</label>
                                            <select name="business_credit_required" className="form-select" value={formData.business_credit_required} onChange={handleChange}>
                                                <option value="Yes">Yes</option>
                                                <option value="No">No</option>
                                            </select>
                                        </div>
                                        <div className="col-md-4">
                                            <label className="form-label">PG Required</label>
                                            <select name="pg_required" className="form-select" value={formData.pg_required} onChange={handleChange}>
                                                <option value="Yes">Yes</option>
                                                <option value="No">No</option>
                                            </select>
                                        </div>
                                        <div className="col-md-4">
                                            <label className="form-label">Status</label>
                                            <select name="status" className="form-select" value={formData.status} onChange={handleChange}>
                                                <option value="Active">Active</option>
                                                <option value="Inactive">Inactive</option>
                                            </select>
                                        </div>

                                        <div className="col-12">
                                            <label className="form-label">Internal Notes</label>
                                            <textarea name="internal_notes" className="form-control" rows="3" value={formData.internal_notes} onChange={handleChange}></textarea>
                                        </div>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
