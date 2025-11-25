import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { DataTable } from '../../components/Table/DataTableWrapper';
import { Column } from 'primereact/column';
import { fetchPartners, allUsers } from '../../modules/partner/services';

export default function Partners() {
    // State for partners
    const [partners, setPartners] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Filter states
    const [searchText, setSearchText] = useState('');
    const [selectedCompany, setSelectedCompany] = useState('');
    const [selectedAssignedUser, setSelectedAssignedUser] = useState('');
    const [appliedSearchText, setAppliedSearchText] = useState('');
    const [appliedCompany, setAppliedCompany] = useState('');
    const [appliedAssignedUser, setAppliedAssignedUser] = useState('');

    // Dropdown data
    const [allPartnersList, setAllPartnersList] = useState([]);
    const [assignedUsersList, setAssignedUsersList] = useState([]);

    // Load all partners for dropdown
    useEffect(() => {
        const loadAllPartners = async () => {
            try {
                const result = await fetchPartners();
                if (result.status) {
                    setAllPartnersList(result.data || []);
                }
            } catch (err) {
                console.error('Failed to load partners list:', err);
            }
        };
        loadAllPartners();
    }, []);

    // Load all assigned users for dropdown
    useEffect(() => {
        const loadAssignedUsers = async () => {
            try {
                const result = await allUsers();
                if (result.status) {
                    setAssignedUsersList(result.data || []);
                }
            } catch (err) {
                console.error('Failed to load assigned users:', err);
            }
        };
        loadAssignedUsers();
    }, []);

    // Load partners data with filters
    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const payload = {
                    search: appliedSearchText || '',
                    partner_id: appliedCompany || '',
                    assigned_user_id: appliedAssignedUser || '',
                };

                const result = await fetchPartners(payload);
                if (result.status) {
                    setPartners(result.data || []);
                    setError(null);
                } else {
                    setError(result.message || 'Failed to fetch partners');
                }
            } catch (err) {
                setError(err.message || 'Failed to fetch partners');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [appliedSearchText, appliedCompany, appliedAssignedUser]);

    // Filter handlers
    const handleApplyFilters = () => {
        setAppliedSearchText(searchText);
        setAppliedCompany(selectedCompany);
        setAppliedAssignedUser(selectedAssignedUser);
    };

    const handleClearFilters = () => {
        setSearchText('');
        setSelectedCompany('');
        setSelectedAssignedUser('');
        setAppliedSearchText('');
        setAppliedCompany('');
        setAppliedAssignedUser('');
    };

    // Column body templates
    const companyNameBody = (rowData) => (
        <Link to={`/partners/${rowData.id}`} className="fw-medium link-primary">
            {rowData.company_name}
        </Link>
    );

    return (
        <div className="page-content">
            {/* Header */}
            <div className="container-fluid">
                <div className="row mb-3 pb-1 page-subheader-sticky bg-body">
                    <div className="col-12">
                        <div className="d-flex align-items-center justify-content-between flex-row">
                            <div className="flex-grow-1">
                                <h4 className="fs-20 mb-1">Partners</h4>
                                <nav aria-label="breadcrumb" className="d-none d-sm-block">
                                    <ol className="breadcrumb m-0">
                                        <li className="breadcrumb-item"><Link to="/">Dashboard</Link></li>
                                        <li className="breadcrumb-item active" aria-current="page">Partners</li>
                                    </ol>
                                </nav>
                            </div>
                            <div className="page-actions d-flex align-items-center gap-2 mt-0">
                                <Link to="/partners/create" className="btn btn-primary w-lg waves-effect">
                                    <i className="ri-add-fill me-1 align-bottom"></i> Add Partner
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Filters and Table */}
                <div className="row">
                    <div className="col-lg-12">
                        <div className="card">
                            <div className="card-body">
                                <form onSubmit={(e) => {
                                    e.preventDefault();
                                    handleApplyFilters();
                                }}>
                                    <div className="row g-3 mb-3">
                                        <div className="col-xxl-4 col-sm-12">
                                            <div className="search-box">
                                                <input
                                                    type="text"
                                                    className="form-control search bg-light border-light"
                                                    id="searchJob"
                                                    placeholder="Search here..."
                                                    autoComplete="off"
                                                    value={searchText}
                                                    onChange={(e) => setSearchText(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault();
                                                            handleApplyFilters();
                                                        }
                                                    }}
                                                />
                                                <i className="ri-search-line search-icon"></i>
                                            </div>
                                        </div>
                                        <div className="col-xxl-2 col-sm-4">
                                            <div className="input-light">
                                                <select
                                                    className="form-control"
                                                    data-choices
                                                    data-choices-search-false
                                                    name="partnerCompany"
                                                    id="partnerCompany"
                                                    value={selectedCompany}
                                                    onChange={(e) => setSelectedCompany(e.target.value)}
                                                >
                                                    <option value="">All Partners</option>
                                                    {allPartnersList.map((partner) => (
                                                        <option key={partner.id} value={partner.id}>
                                                            {partner.company_name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                        <div className="col-xxl-2 col-sm-4">
                                            <div className="input-light">
                                                <select
                                                    className="form-control"
                                                    data-choices
                                                    data-choices-search-false
                                                    name="assignedUserFilter"
                                                    id="assignedUserFilter"
                                                    value={selectedAssignedUser}
                                                    onChange={(e) => setSelectedAssignedUser(e.target.value)}
                                                >
                                                    <option value="">All Assigned Users</option>
                                                    {assignedUsersList.map((user) => (
                                                        <option key={user.id} value={user.id}>
                                                            {user.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                        <div className="col-xxl-2 col-sm-4">
                                            <button type="button" className="btn btn-warning w-100" onClick={handleApplyFilters}>
                                                <i className="ri-equalizer-fill me-1 align-bottom"></i> Apply
                                            </button>
                                        </div>
                                        <div className="col-xxl-2 col-sm-4">
                                            <button type="button" className="btn btn-outline-secondary w-100" onClick={handleClearFilters}>
                                                <i className="ri-close-line me-1 align-bottom"></i> Clear
                                            </button>
                                        </div>
                                    </div>
                                </form>

                                {/* DataTable with Skeleton Loader */}
                                <div className="table-responsive table-card mt-1">
                                    <DataTable
                                        scrollable
                                        scrollHeight="510px"
                                        value={partners}
                                        dataKey="id"
                                        responsiveLayout="scroll"
                                        className="p-datatable-sm"
                                        loading={loading}
                                        emptyMessage="No partners found"
                                        rows={10}
                                    >
                                        <Column
                                            field="company_name"
                                            header="Company Name"
                                            body={companyNameBody}
                                            style={{ minWidth: '200px' }}
                                        />
                                        <Column
                                            field="owner_name"
                                            header="Owner Name"
                                            style={{ minWidth: '150px' }}
                                        />
                                        <Column
                                            field="contact_person"
                                            header="Contact Person"
                                            style={{ minWidth: '150px' }}
                                        />
                                        <Column
                                            field="company_email"
                                            header="Email"
                                            style={{ minWidth: '200px' }}
                                        />
                                        <Column
                                            field="company_phone"
                                            header="Phone Number"
                                            style={{ minWidth: '150px' }}
                                        />
                                        <Column
                                            field="assigned_user_name"
                                            header="Assigned User"
                                            style={{ minWidth: '150px' }}
                                        />
                                        <Column
                                            field="partner_type"
                                            header="Partner Type"
                                            style={{ minWidth: '120px' }}
                                        />
                                    </DataTable>
                                </div>

                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
