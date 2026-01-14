import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { getLead, createLead, updateLead } from '../../modules/leads/services';
import { allUsers } from '../../modules/partner/services';
import { usePermissions } from '../../lib/auth/usePermissions';
import { Navigate } from 'react-router-dom';
import ProfileMetricCard from '../../components/Common/ProfileMetricCard';
import ProfileMetricCardSkeleton from '../../components/Common/ProfileMetricCardSkeleton';
import EmailComposeModal from '../../components/Common/Modals/EmailComposeModal';
import ActivityCreateModal from '../../components/Common/Modals/ActivityCreateModal';
import ActivitySidebar from '../../components/Common/Activity/ActivitySidebar';

export default function LeadDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { hasPermission } = usePermissions();

    const [activeTab, setActiveTab] = useState('leadDetails');
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        lead_id: '',
        tasks_no: '',
        probability: '',
        lead_type: '',
        status: '',
        salesperson_id: '',
        company_name: '',
        domain: '',
        lead_source: '',
        employees: '',
        contact_person: '',
        phone_number: '',
        email: '',
        legal_business_name: '',
        business_ein: '',
        state_file_number: '',
        duns_number: '',
        business_address: '',
        country: 'USA',
        city: '',
        state: '',
        zip_code: '',
        business_phone: '',
        entity_type: '',
        industry_type: '',
        business_start_date: '',
        ssn_last_4: '',
        requirement_details: '',
        partner_id: '',
        partner_manager: ''
    });

    const [users, setUsers] = useState([]);
    const [partners, setPartners] = useState([]);
    const [profileStats, setProfileStats] = useState({
        total_meetings: 0,
        total_clients: 0,
        total_invoice: 0,
        enrollment_type: 'N/A',
        total_tickets: 0
    });
    const [statsLoading, setStatsLoading] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const usersRes = await allUsers();
                if (usersRes.status) setUsers(usersRes.data);
                
                // Fetch partners list for the dropdown
                const partnersRes = await fetch('/api/admin/partners/get-all-partners').then(res => res.json()); 
                if (partnersRes.status) setPartners(partnersRes.data);
            } catch (err) {
                console.error(err);
            }
        };
        fetchData();
    }, []);

    useEffect(() => {
        if (id) {
            const loadLead = async () => {
                setLoading(true);
                try {
                    const res = await getLead(id);
                    if (res.status) {
                        setFormData(res.data);
                    }
                } catch (err) {
                    toast.error('Failed to load lead details');
                } finally {
                    setLoading(false);
                }
            };
            loadLead();
        }
    }, [id]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = async () => {
        try {
            setLoading(true);
            if (id) {
                await updateLead(id, formData);
                toast.success('Lead updated successfully');
            } else {
                await createLead(formData);
                toast.success('Lead created successfully');
                navigate('/leads');
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to save lead');
        } finally {
            setLoading(false);
        }
    };

    const metricsConfig = [
        { label: 'Meetings', dataKey: 'total_meetings', icon: 'ri-calendar-line' },
        { label: 'Total Clients', dataKey: 'total_clients', icon: 'ri-star-line' },
        { label: 'Invoiced', dataKey: 'total_invoice', icon: 'ri-file-edit-line' },
        { label: 'Subscriptions', dataKey: 'enrollment_type', icon: 'ri-money-dollar-circle-line' },
        { label: 'Tickets', dataKey: 'total_tickets', icon: 'ri-lifebuoy-line' },
    ];

    return (
        <div className="page-content">
            <ToastContainer position="top-right" autoClose={3000} />
            <div className="container-fluid">
                {/* Page Title */}
                <div className="row mb-3 pb-1 page-subheader-sticky bg-body">
                    <div className="col-12">
                        <div className="d-flex align-items-center justify-content-between flex-row">
                            <div className="flex-grow-1">
                                <h4 className="fs-20 mb-1">Lead Profile</h4>
                                <nav aria-label="breadcrumb">
                                    <ol className="breadcrumb m-0">
                                        <li className="breadcrumb-item"><Link to="/">Dashboard</Link></li>
                                        <li className="breadcrumb-item"><Link to="/leads">Leads</Link></li>
                                        <li className="breadcrumb-item active">Lead Profile</li>
                                    </ol>
                                </nav>
                            </div>
                            <div className="d-flex gap-2">
                                <Link to="/leads" className="btn btn-outline-secondary w-lg waves-effect">
                                    <i className="ri-arrow-left-line align-middle me-1"></i> Back
                                </Link>
                                <button className="btn btn-primary w-lg waves-effect" onClick={handleSave} disabled={loading}>
                                    <i className="ri-save-3-line align-middle me-1"></i> {id ? 'Update' : 'Save'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Metrics Strip */}
                <div className="row pt-1">
                    <div className="col-12">
                        <div className="d-flex flex-wrap metrics-strip justify-content-center">
                            {statsLoading ? (
                                [1, 2, 3, 4, 5].map((_, index) => (
                                    <ProfileMetricCardSkeleton key={index} />
                                ))
                            ) : (
                                metricsConfig.map((metric, index) => (
                                    <ProfileMetricCard
                                        key={index}
                                        label={metric.label}
                                        value={profileStats[metric.dataKey]}
                                        icon={metric.icon}
                                    />
                                ))
                            )}
                        </div>
                    </div>
                </div>

                <div className="row">
                    {/* Main Content */}
                    <div className="col-xxl-8">
                        <div className="card">
                            <div className="card-header">
                                <ul className="nav nav-tabs-custom rounded card-header-tabs border-bottom-0" role="tablist">
                                    <li className="nav-item">
                                        <a className={`nav-link ${activeTab === 'leadDetails' ? 'active' : ''}`} onClick={() => setActiveTab('leadDetails')} href="#">Lead Details</a>
                                    </li>
                                    <li className="nav-item">
                                        <a className={`nav-link ${activeTab === 'contactInfo' ? 'active' : ''}`} onClick={() => setActiveTab('contactInfo')} href="#">Contact Info</a>
                                    </li>
                                    <li className="nav-item">
                                        <a className={`nav-link ${activeTab === 'partnerDetails' ? 'active' : ''}`} onClick={() => setActiveTab('partnerDetails')} href="#">Partner Details</a>
                                    </li>
                                </ul>
                            </div>
                            <div className="card-body p-4">
                                <div className="tab-content">
                                    {activeTab === 'leadDetails' && (
                                        <div className="row">
                                            <div className="col-lg-6">
                                                <div className="mb-3">
                                                    <label className="form-label">Lead ID</label>
                                                    <input type="text" className="form-control" name="lead_id" value={formData.lead_id} onChange={handleInputChange} placeholder="LD-2026-0114-340" />
                                                </div>
                                            </div>
                                            <div className="col-lg-6">
                                                <div className="mb-3">
                                                    <label className="form-label">Tasks No</label>
                                                    <select className="form-select" name="tasks_no" value={formData.tasks_no} onChange={handleInputChange}>
                                                        <option value="">Select task</option>
                                                        <option value="#VLZ456">#VLZ456</option>
                                                    </select>
                                                </div>
                                            </div>
                                            <div className="col-lg-6">
                                                <div className="mb-3">
                                                    <label className="form-label">Probability (%)</label>
                                                    <select className="form-select" name="probability" value={formData.probability} onChange={handleInputChange}>
                                                        <option value="">Select probability</option>
                                                        <option value="10%">10%</option>
                                                        <option value="50%">50%</option>
                                                        <option value="80%">80%</option>
                                                    </select>
                                                </div>
                                            </div>
                                            <div className="col-lg-6">
                                                <div className="mb-3">
                                                    <label className="form-label">Lead Type</label>
                                                    <select className="form-select" name="lead_type" value={formData.lead_type} onChange={handleInputChange}>
                                                        <option value="">Select type</option>
                                                        <option value="High">High</option>
                                                        <option value="Medium">Medium</option>
                                                        <option value="Low">Low</option>
                                                    </select>
                                                </div>
                                            </div>
                                            <div className="col-lg-6">
                                                <div className="mb-3">
                                                    <label className="form-label">Status</label>
                                                    <select className="form-select" name="status" value={formData.status} onChange={handleInputChange}>
                                                        <option value="">Select status</option>
                                                        <option value="New">New</option>
                                                        <option value="Contact Initiated">Contact Initiated</option>
                                                    </select>
                                                </div>
                                            </div>
                                            <div className="col-lg-6">
                                                <div className="mb-3">
                                                    <label className="form-label">Salesperson</label>
                                                    <select className="form-select" name="salesperson_id" value={formData.salesperson_id} onChange={handleInputChange}>
                                                        <option value="">Select salesperson</option>
                                                        {users.map(user => (
                                                            <option key={user.id} value={user.id}>{user.name}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                            <div className="col-lg-6">
                                                <div className="mb-3">
                                                    <label className="form-label">Organization Name</label>
                                                    <input type="text" className="form-control" name="company_name" value={formData.company_name} onChange={handleInputChange} placeholder="Enter organization name" />
                                                </div>
                                            </div>
                                            <div className="col-lg-6">
                                                <div className="mb-3">
                                                    <label className="form-label">Domain</label>
                                                    <input type="text" className="form-control" name="domain" value={formData.domain} onChange={handleInputChange} placeholder="Enter domain" />
                                                </div>
                                            </div>
                                            <div className="col-lg-6">
                                                <div className="mb-3">
                                                    <label className="form-label">Lead Source</label>
                                                    <select className="form-select" name="lead_source" value={formData.lead_source} onChange={handleInputChange}>
                                                        <option value="">Select source</option>
                                                        <option value="Website">Website</option>
                                                        <option value="Referral">Referral</option>
                                                    </select>
                                                </div>
                                            </div>
                                            <div className="col-lg-6">
                                                <div className="mb-3">
                                                    <label className="form-label">Employees</label>
                                                    <select className="form-select" name="employees" value={formData.employees} onChange={handleInputChange}>
                                                        <option value="">Select employees</option>
                                                        <option value="1-10">1-10</option>
                                                        <option value="11-50">11-50</option>
                                                        <option value="50+">50+</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {activeTab === 'contactInfo' && (
                                        <div className="row">
                                            <div className="col-lg-6">
                                                <div className="mb-3">
                                                    <label className="form-label">Contact person</label>
                                                    <input type="text" className="form-control" name="contact_person" value={formData.contact_person} onChange={handleInputChange} placeholder="Dave" />
                                                </div>
                                            </div>
                                            <div className="col-lg-6">
                                                <div className="mb-3">
                                                    <label className="form-label">Phone Number</label>
                                                    <input type="text" className="form-control" name="phone_number" value={formData.phone_number} onChange={handleInputChange} placeholder="+(1) 987 6543" />
                                                </div>
                                            </div>
                                            <div className="col-lg-6">
                                                <div className="mb-3">
                                                    <label className="form-label">Lead Contact Email</label>
                                                    <input type="email" className="form-control" name="email" value={formData.email} onChange={handleInputChange} placeholder="dave@example.com" />
                                                </div>
                                            </div>
                                            <div className="col-lg-6">
                                                <div className="mb-3">
                                                    <label className="form-label">Legal Business Name</label>
                                                    <input type="text" className="form-control" name="legal_business_name" value={formData.legal_business_name} onChange={handleInputChange} placeholder="Enter business name" />
                                                </div>
                                            </div>
                                            <div className="col-lg-6">
                                                <div className="mb-3">
                                                    <label className="form-label">Business EIN</label>
                                                    <input type="text" className="form-control" name="business_ein" value={formData.business_ein} onChange={handleInputChange} placeholder="Enter 9-digit EIN" />
                                                </div>
                                            </div>
                                            <div className="col-lg-6">
                                                <div className="mb-3">
                                                    <label className="form-label">State File Number</label>
                                                    <input type="text" className="form-control" name="state_file_number" value={formData.state_file_number} onChange={handleInputChange} placeholder="Enter state file number" />
                                                </div>
                                            </div>
                                            <div className="col-lg-6">
                                                <div className="mb-3">
                                                    <label className="form-label">D-U-N-S Number</label>
                                                    <input type="text" className="form-control" name="duns_number" value={formData.duns_number} onChange={handleInputChange} placeholder="Enter 9-digit D-U-N-S" />
                                                </div>
                                            </div>
                                            <div className="col-lg-6">
                                                <div className="mb-3">
                                                    <label className="form-label">Business Address</label>
                                                    <input type="text" className="form-control" name="business_address" value={formData.business_address} onChange={handleInputChange} placeholder="Enter business address" />
                                                </div>
                                            </div>
                                            <div className="col-lg-4">
                                                <div className="mb-3">
                                                    <label className="form-label">City</label>
                                                    <input type="text" className="form-control" name="city" value={formData.city} onChange={handleInputChange} placeholder="City" />
                                                </div>
                                            </div>
                                            <div className="col-lg-4">
                                                <div className="mb-3">
                                                    <label className="form-label">State</label>
                                                    <select className="form-select" name="state" value={formData.state} onChange={handleInputChange}>
                                                        <option value="">Select state</option>
                                                        <option value="Florida">Florida</option>
                                                        <option value="California">California</option>
                                                    </select>
                                                </div>
                                            </div>
                                            <div className="col-lg-4">
                                                <div className="mb-3">
                                                    <label className="form-label">Zip Code</label>
                                                    <input type="text" className="form-control" name="zip_code" value={formData.zip_code} onChange={handleInputChange} placeholder="Enter zipcode" />
                                                </div>
                                            </div>
                                            <div className="col-lg-6">
                                                <div className="mb-3">
                                                    <label className="form-label">Business Phone</label>
                                                    <input type="text" className="form-control" name="business_phone" value={formData.business_phone} onChange={handleInputChange} placeholder="Enter business phone" />
                                                </div>
                                            </div>
                                            <div className="col-lg-6">
                                                <div className="mb-3">
                                                    <label className="form-label">Entity Type</label>
                                                    <select className="form-select" name="entity_type" value={formData.entity_type} onChange={handleInputChange}>
                                                        <option value="">Select entity type</option>
                                                        <option value="LLC">LLC</option>
                                                        <option value="Corporation">Corporation</option>
                                                    </select>
                                                </div>
                                            </div>
                                            <div className="col-lg-12">
                                                <div className="mb-3">
                                                    <label className="form-label">Industry Type</label>
                                                    <select className="form-select" name="industry_type" value={formData.industry_type} onChange={handleInputChange}>
                                                        <option value="">Select industry type</option>
                                                        <option value="Finance">Finance</option>
                                                        <option value="Tech">Tech</option>
                                                    </select>
                                                </div>
                                            </div>
                                            <div className="col-lg-6">
                                                <div className="mb-3">
                                                    <label className="form-label">Business Start Date</label>
                                                    <input type="date" className="form-control" name="business_start_date" value={formData.business_start_date} onChange={handleInputChange} />
                                                </div>
                                            </div>
                                            <div className="col-lg-6">
                                                <div className="mb-3">
                                                    <label className="form-label">SSN Last 4</label>
                                                    <input type="text" className="form-control" name="ssn_last_4" value={formData.ssn_last_4} onChange={handleInputChange} placeholder="Enter last 4 digits of SSN" />
                                                </div>
                                            </div>
                                            <div className="col-lg-12">
                                                <div className="mb-3">
                                                    <label className="form-label">Requirement Details</label>
                                                    <textarea className="form-control" name="requirement_details" value={formData.requirement_details} onChange={handleInputChange} rows="3" placeholder="Enter details"></textarea>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {activeTab === 'partnerDetails' && (
                                        <div className="row">
                                            <div className="col-lg-6">
                                                <div className="mb-3">
                                                    <label className="form-label">Partner</label>
                                                    <select className="form-select" name="partner_id" value={formData.partner_id} onChange={handleInputChange}>
                                                        <option value="">Select partner</option>
                                                        {partners.map(partner => (
                                                            <option key={partner.id} value={partner.id}>{partner.full_name}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                            <div className="col-lg-6">
                                                <div className="mb-3">
                                                    <label className="form-label">Partner Manager</label>
                                                    <input type="text" className="form-control" name="partner_manager" value={formData.partner_manager} onChange={handleInputChange} placeholder="Enter partner manager" />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Activity Sidebar */}
                    <div className="col-xxl-4">
                        <ActivitySidebar entityId={id} entityType="Lead" />
                    </div>
                </div>
            </div>

            {/* Modals */}
            <EmailComposeModal entityId={id} entityType="Lead" />
            <ActivityCreateModal entityId={id} entityType="Lead" />
        </div>
    );
}
