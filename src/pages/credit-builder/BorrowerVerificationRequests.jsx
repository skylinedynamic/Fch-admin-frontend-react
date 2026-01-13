import React, { useEffect, useState, useCallback } from 'react';
import { Link, useParams, useLocation, useNavigate } from 'react-router-dom';
import { DataTable } from '../../components/Table/DataTableWrapper';
import { Column } from 'primereact/column';
import { Dropdown } from 'primereact/dropdown';
import { Calendar } from 'primereact/calendar';
import { FilterMatchMode, FilterOperator } from 'primereact/api';
import { fetchBorrowerVerificationRequests, updateVerificationStatus, getBorrowerProfile } from '../../modules/verification-center/services'; // Import getBorrowerProfile
import BorrowerProfileModal from './components/BorrowerProfileModal'; // Import Modal
import VerificationActionModal from './components/VerificationActionModal'; // Import Action Modal
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { VERIFICATION_STATUS } from '../../config/creditBuilder'; // Import Constants
import { useTiers } from '../../modules/tiers/queries';
import TableLoader from '../../components/Loader/TableLoader';
import '../../components/Loader/SkeletonLoader.css'; // Import Loader CSS

export default function BorrowerVerificationRequests() {
    const location = useLocation();
    const navigate = useNavigate();
    const { borrower_id } = useParams(); // Get ID from URL
    const { partner_id } = location.state || {}; // Optional: keep partner_id from state if available, but profile fetch is better source

    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Profile Data State
    const [profileData, setProfileData] = useState(null);
    const [profileLoading, setProfileLoading] = useState(true);

    // Pagination & Sort
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    const [totalRecords, setTotalRecords] = useState(0);
    const [sortField, setSortField] = useState('request_date');
    const [sortOrder, setSortOrder] = useState('desc');

    // Column Filters
    const [filters, setFilters] = useState({
        task_title: { constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
        tier_name: { constraints: [{ value: null }] },
        request_date: { constraints: [{ value: null }] }
    });

    // Filters
    const [searchText, setSearchText] = useState('');
    const [appliedSearchText, setAppliedSearchText] = useState('');
    const [selectedTier, setSelectedTier] = useState('');
    const [appliedTier, setAppliedTier] = useState('');
    const [selectedStatus, setSelectedStatus] = useState(VERIFICATION_STATUS.PROCESSING);
    const [appliedStatus, setAppliedStatus] = useState(VERIFICATION_STATUS.PROCESSING);
    const [tiersList, setTiersList] = useState([]);


    const fetchProfileData = async () => {
        if (!borrower_id) return;
        setProfileLoading(true);
        try {
            const response = await getBorrowerProfile(borrower_id);
            if (response.status && response.data) {
                setProfileData(response.data);
                // Set default tier filter based on profile
                if (response.data.current_tier) {
                    // Ensure type consistency (e.g. if API returns string "1" and options are number 1)
                    // We can try to find the matching option in tiersList if available, or just set it. 
                    // Since tiersList might not be loaded, we trust the ID value.
                    setSelectedTier(response.data.current_tier);
                    setAppliedTier(response.data.current_tier);
                }
            }
        } catch (error) {
            console.error("Failed to fetch profile data", error);
            toast.error("Failed to load borrower profile");
        } finally {
            setProfileLoading(false);
        }
    };

    // Fetch Tiers
    const { data: tiersData } = useTiers();

    useEffect(() => {
        if (tiersData?.status && tiersData?.data) {
            const formattedTiers = (tiersData.data || []).map(tier => ({
                label: tier.name,
                value: tier.id
            }));
            setTiersList(formattedTiers);
        }
    }, [tiersData]);

    const loadRequests = useCallback(async () => {
        // Wait for profile data to get partner_id (or if it was passed in state fallback, but mainly rely on profile now)
        // If we don't have profileData yet, we can't load requests reliably if we need partner_id from it
        if (!borrower_id) return;
        

        setLoading(true);
        try {
            const payload = {
                borrower_id,
                page: page,
                per_page: perPage,
                sort_field: sortField,
                sort_order: sortOrder,
                search: appliedSearchText,
                tier_id: appliedTier,
                status: appliedStatus,
                filters: filters
            };

            const response = await fetchBorrowerVerificationRequests(payload);

            if (response.status) {
                setRequests(response.data || []);
                setTotalRecords(response.meta?.total || 0);
            } else {
                toast.error(response.message || 'Failed to load requests');
                setRequests([]);
            }
        } catch (err) {
            console.error('Error loading borrower requests:', err);
            toast.error('Failed to load requests');
            setRequests([]);
        } finally {
            setLoading(false);
        }
    }, [borrower_id, partner_id, profileData, page, perPage, sortField, sortOrder, appliedSearchText, appliedTier, appliedStatus, filters]);

    useEffect(() => {
        fetchProfileData();
    }, [borrower_id]);

    useEffect(() => {
        if (profileData) {
            loadRequests();
        }
    }, [profileData, loadRequests]);

    const onPage = (event) => {
        setPage(event.first / event.rows + 1);
        setPerPage(event.rows);
    };

    const onSort = (event) => {
        setSortField(event.sortField);
        setSortOrder(event.sortOrder === 1 ? 'asc' : 'desc');
    };

    const onFilter = (event) => {
        setFilters(event.filters);
    };

    const handleApplyFilters = () => {
        setAppliedSearchText(searchText);
        setAppliedTier(selectedTier);
        setAppliedStatus(selectedStatus);
        setPage(1);
    };

    const handleClearFilters = () => {
        setSearchText('');
        setAppliedSearchText('');
        setSelectedTier(profileData?.current_tier_id || ''); // Reset to default if exists, or empty
        setAppliedTier(profileData?.current_tier_id || '');
        setSelectedStatus(VERIFICATION_STATUS.PROCESSING);
        setAppliedStatus(VERIFICATION_STATUS.PROCESSING);
        setFilters({
            task_title: { constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
            tier_name: { constraints: [{ value: null }] },
            request_date: { constraints: [{ value: null }] }
        });
        setPage(1);
    };

    const [selectedRequests, setSelectedRequests] = useState([]);

    // Profile Modal State
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [selectedBorrowerIdProfile, setSelectedBorrowerIdProfile] = useState(null);

    // Verification/Reject Action Modal State
    const [showActionModal, setShowActionModal] = useState(false);
    const [actionType, setActionType] = useState('verify'); // 'verify' or 'reject'
    const [selectedRequest, setSelectedRequest] = useState(null); // Single request (original logic)
    const [isBulkAction, setIsBulkAction] = useState(false); // Flag for bulk
    const [actionLoading, setActionLoading] = useState(false);
    const [validationErrors, setValidationErrors] = useState(null);

    const openActionModal = (type, rowData = null) => {
        setActionType(type);
        setValidationErrors(null); // Clear previous errors
        
        if (rowData) {
            // Single action
            setSelectedRequest(rowData);
            setIsBulkAction(false);
        } else {
            // Bulk action
            setSelectedRequest(null);
            setIsBulkAction(true);
        }
        setShowActionModal(true);
    };

    const handleActionConfirm = async (reason) => {
        const requestsToProcess = isBulkAction ? selectedRequests : [selectedRequest];
        
        if (!requestsToProcess || requestsToProcess.length === 0) return;

        setActionLoading(true);
        
        // Convert to array of promises
        const promises = requestsToProcess.map(req => {
            const payload = {
                request_id: req.id,
                status: actionType === 'verify' ? 'verified' : 'rejected',
                rejection_reason: reason
            };
            return updateVerificationStatus(payload);
        });

        try {
            const results = await Promise.allSettled(promises);
            
            let successCount = 0;
            let failCount = 0;

            results.forEach(result => {
                if (result.status === 'fulfilled' && result.value.status) {
                    successCount++;
                } else {
                    failCount++;
                }
            });

            if (successCount > 0) {
                 toast.success(`${successCount} request(s) ${actionType === 'verify' ? 'verified' : 'rejected'} successfully`);
            }
            if (failCount > 0) {
                 toast.error(`Failed to update ${failCount} request(s)`);
            }

            setShowActionModal(false);
            loadRequests(); // Refresh list
            setSelectedRequests([]); // Clear selection after bulk action
            
        } catch (err) {
             console.error("Bulk action error", err);
             toast.error("An unexpected error occurred processing requests.");
        } finally {
            setActionLoading(false);
        }
    };

    const statusTemplate = (rowData) => {
        let badgeClass = 'bg-info-subtle text-info';
        if (rowData.status === VERIFICATION_STATUS.PENDING) badgeClass = 'bg-warning-subtle text-warning';
        if (rowData.status === VERIFICATION_STATUS.COMPLETED) badgeClass = 'bg-success-subtle text-success';
        if (rowData.status === VERIFICATION_STATUS.REJECTED) badgeClass = 'bg-danger-subtle text-danger';

        return (
            <span className={`badge ${badgeClass} fs-12 text-capitalize`}>
                {rowData.status}
            </span>
        );
    };

    const tierFilterTemplate = (options) => {
        return (
            <Dropdown 
                value={options.value} 
                options={tiersList} 
                onChange={(e) => options.filterCallback(e.value)} 
                placeholder="Select Tier" 
                className="p-column-filter" 
                showClear 
            />
        );
    };

    const dateFilterTemplate = (options) => {
        return (
            <Calendar 
                value={options.value} 
                onChange={(e) => options.filterCallback(e.value, options.index)} 
                selectionMode="range" 
                placeholder="Select Date Range" 
                dateFormat="yy-mm-dd" 
                className="p-column-filter" 
                showIcon
            />
        );
    };

    const taskTitleTemplate = (rowData) => {
        return (
            <div className="fw-medium">
                {rowData.task_title}
            </div>
        );
    };

    const actionBodyTemplate = (rowData) => {
        return (
            <div className="d-flex gap-2 justify-content-center">
                <button 
                    className="btn btn-sm btn-soft-success" 
                    onClick={() => openActionModal('verify', rowData)}
                    title="Verify"
                >
                    <i className="ri-check-line align-bottom"></i>
                </button>
                <button 
                    className="btn btn-sm btn-soft-danger" 
                    onClick={() => openActionModal('reject', rowData)}
                    title="Reject"
                >
                    <i className="ri-close-line align-bottom"></i>
                </button>
            </div>
        );
    };

    return (
        <div className="page-content">
            <ToastContainer position="top-right" autoClose={3000} />
            <div className="container-fluid">
                <div className="row mb-3 pb-1 page-subheader-sticky bg-body">
                    <div className="col-12">
                        <div className="d-flex align-items-center justify-content-between flex-row">
                            <div className="flex-grow-1">
                                <h4 className="fs-20 mb-1">Borrower Request Task Details</h4>
                                <nav aria-label="breadcrumb">
                                    <ol className="breadcrumb m-0">
                                        <li className="breadcrumb-item"><Link to="/">Dashboard</Link></li>
                                        <li className="breadcrumb-item"><Link to="/verification-center">Verification Center</Link></li>
                                        <li className="breadcrumb-item active">Borrower Request Task Details</li>
                                    </ol>
                                </nav>
                            </div>
                            <div className="flex-shrink-0 d-flex gap-2">
                                <button
                                    onClick={() => navigate('/verification-center')}
                                    className="btn btn-outline-primary btn-md px-4"
                                    style={{ borderRadius: '5px' }}
                                >
                                    <i className="ri-arrow-left-line align-bottom me-1"></i> Back
                                </button>
                                {selectedRequests.length > 0 && (
                                    <div className="btn-group">
                                        <button type="button" className="btn bg-success text-white fw-medium">
                                            Actions
                                        </button>
                                        <button type="button" className="btn bg-success text-white fw-medium dropdown-toggle dropdown-toggle-split" data-bs-toggle="dropdown" aria-expanded="false">
                                            <span className="visually-hidden">Toggle dropdown</span>
                                        </button>
                                        <ul className="dropdown-menu dropdown-menu-end">
                                            <li>
                                                <button
                                                    type="button"
                                                    className="dropdown-item"
                                                    onClick={() => openActionModal('verify')}
                                                >
                                                    <i className="ri-check-double-line me-1 align-bottom"></i> Bulk Verify
                                                </button>
                                            </li>
                                            <li>
                                                <button
                                                    type="button"
                                                    className="dropdown-item text-danger"
                                                    onClick={() => openActionModal('reject')}
                                                >
                                                    <i className="ri-close-circle-line me-1 align-bottom"></i> Bulk Reject
                                                </button>
                                            </li>
                                        </ul>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>



                <div className="row">
                    <div className="col-12">
                        <div className="card border-0 shadow-sm">
                            <div className="card-body">
                                <form onSubmit={(e) => {
                                    e.preventDefault();
                                    handleApplyFilters();
                                }}>
                                    <div className="row g-3 mb-4">
                                        <div className="col-xxl-4 col-lg-4">
                                            <div className="search-box">
                                                <input
                                                    type="text"
                                                    className="form-control search bg-light border-light"
                                                    placeholder="Search task title..."
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

                                        <div className="col-xxl-3 col-sm-4">
                                            <Dropdown
                                                value={selectedTier}
                                                onChange={(e) => setSelectedTier(e.value)}
                                                options={[
                                                    { label: 'All Tiers', value: '' },
                                                    ...tiersList
                                                ]}
                                                optionLabel="label"
                                                optionValue="value"
                                                placeholder="All Tiers"
                                                className="w-100 employee-filter-dropdown"
                                            />
                                        </div>

                                        <div className="col-xxl-2 col-sm-4">
                                            <Dropdown
                                                value={selectedStatus}
                                                onChange={(e) => setSelectedStatus(e.value)}
                                                options={[
                                                    { label: 'All Status', value: '' },
                                                    { label: 'Processing', value: VERIFICATION_STATUS.PROCESSING },
                                                    { label: 'Verified', value: VERIFICATION_STATUS.COMPLETED },
                                                    { label: 'Rejected', value: VERIFICATION_STATUS.REJECTED }
                                                ]}
                                                optionLabel="label"
                                                optionValue="value"
                                                placeholder="All Status"
                                                className="w-100 employee-filter-dropdown"
                                            />
                                        </div>

                                        <div className="col-xxl-3 col-lg-4">
                                            <div className="d-flex gap-2">
                                                <button type="submit" className="btn btn-warning flex-grow-1">
                                                    <i className="ri-equalizer-fill me-1 align-bottom"></i> Filters
                                                </button>
                                                <button type="button" className="btn btn-default flex-grow-1" onClick={handleClearFilters}>
                                                    <i className="ri-close-line me-1 align-bottom"></i> Clear
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </form>

                                <div className="card bg-primary-subtle border-0 mb-4 position-relative overflow-hidden" style={{ borderRadius: '15px' }}>
                                    <div className="card-body p-4">
                                        {/* Decorative backgrounds */}


                                        <div className="row align-items-center position-relative">
                                            <div className="col-auto">
                                                <div className="avatar-md p-1 bg-white rounded-circle shadow-sm">
                                                    {profileLoading ? (
                                                        <div className="skeleton-line rounded-circle w-100 h-100"></div>
                                                    ) : (
                                                        <div className="avatar-title bg-primary rounded-circle fs-24">
                                                            {profileData?.first_name ? profileData.first_name.charAt(0).toUpperCase() : 'B'}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="col">
                                                <div className="ps-2">
                                                    <div className="row g-0 align-items-center">
                                                        <div className="col-md-6 border-end-md pe-md-4">
                                                            <span className="text-muted text-uppercase fw-semibold fs-11 d-block mb-1">Borrower Name</span>
                                                            <div className="d-flex align-items-center">
                                                                {profileLoading ? (
                                                                    <div className="skeleton-line w-50" style={{ height: '20px', borderRadius: '4px' }}></div>
                                                                ) : (
                                                                    <>
                                                                        <h4 className="fs-18 mb-0 fw-bold text-primary">{profileData?.full_name || 'N/A'}</h4>
                                                                        {profileData?.status && <span className="badge bg-success-subtle text-success ms-2 fs-10 text-uppercase">{profileData.status}</span>}
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="col-md-6 ps-md-4">
                                                            <span className="text-muted text-uppercase fw-semibold fs-11 d-block mb-1">Partner Name</span>
                                                            <div className="d-flex align-items-center">
                                                                <i className="ri-building-line me-2 text-primary fs-16"></i>
                                                                {profileLoading ? (
                                                                    <div className="skeleton-line w-50" style={{ height: '16px', borderRadius: '4px' }}></div>
                                                                ) : (
                                                                    <h5 className="fs-15 mb-0 fw-medium text-dark-emphasis">{profileData?.partner_name || 'N/A'}</h5>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="mt-2 pt-2 border-top">
                                                        <p className="text-muted mb-0 fs-12">
                                                            <h6 className="fs-14 mb-0 fw-medium text-info">
                                                            </h6>        </p>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="col-lg-auto mt-3 mt-lg-0 border-start-lg ps-lg-4">
                                                <div className="d-flex gap-4">
                                                    <div className="text-center">
                                                        <p className="text-muted text-uppercase fw-semibold fs-11 mb-1">Total Pending Requests</p>
                                                        <h6 className="mb-0 fw-bold">{totalRecords}</h6>
                                                    </div>
                                                </div>
                                                <div className="mt-3 text-center">
                                                    <button
                                                        className="btn btn-sm btn-soft-primary w-100"
                                                        onClick={() => setShowProfileModal(true)}
                                                    >
                                                        <i className="ri-user-line me-1 align-bottom"></i> View Profile
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>



                                {loading ? (
                                    <TableLoader
                                        rows={8}
                                        columns={[
                                            { style: { width: '3%' } },
                                            { style: { width: '25%' } },
                                            { style: { width: '15%' } },
                                            { style: { width: '17%' } },
                                            { style: { width: '25%' } },
                                            { style: { width: '15%' } }
                                        ]}
                                    />
                                ) : (
                                    <DataTable
                                        value={requests || []}
                                        paginator
                                        rows={perPage}
                                        totalRecords={totalRecords}
                                        lazy
                                        first={(page - 1) * perPage}
                                        onPage={onPage}
                                        onSort={onSort}
                                        sortField={sortField}
                                        sortOrder={sortOrder === 'asc' ? 1 : -1}
                                        filters={filters}
                                        filterDisplay="menu"
                                        onFilter={onFilter}
                                        className="p-datatable-sm custom-table"
                                        tableStyle={{ minWidth: '80rem' }}
                                        dataKey="id"
                                        responsiveLayout="scroll"
                                        selection={selectedRequests}
                                        onSelectionChange={(e) => setSelectedRequests(e.value)}
                                    >
                                        <Column selectionMode="multiple" headerStyle={{ width: '3rem' }}></Column>

                                        <Column
                                            field="task_title"
                                            header="Task Title"
                                            body={taskTitleTemplate}
                                            sortable
                                            filter
                                            filterPlaceholder="Search Task"
                                            style={{ width: '25%' }}
                                        />
                                        <Column
                                            field="tier_name"
                                            header="Tier"
                                            sortable
                                            filter
                                            filterElement={tierFilterTemplate}
                                            showFilterMatchModes={false}
                                            filterPlaceholder="Search Tier"
                                            style={{ width: '15%' }}
                                            body={(rowData) => <span className="badge bg-info-subtle text-info fs-11">{rowData.tier_name}</span>}
                                        />
                                        <Column
                                            field="status"
                                            header="Status"
                                            body={statusTemplate}
                                            sortable
                                            showFilterMatchModes={false}
                                            style={{ width: '17%' }}
                                        />
                                        <Column
                                            field="request_date"
                                            header="Request Date"
                                            sortable
                                            filter
                                            showFilterMatchModes={false}
                                            filterElement={dateFilterTemplate}
                                            filterPlaceholder="Search Date"
                                            style={{ width: '25%' }}
                                            body={(rowData) => <span className="text-muted">{rowData.request_date}</span>}
                                        />
                                        <Column
                                            header="Action"
                                            body={actionBodyTemplate}
                                            alignHeader={'center'} 
                                            style={{ minWidth: '8rem', textAlign: 'center', width: '15%' }} 
                                        />
                                    </DataTable>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Profile Modal */}
            <BorrowerProfileModal
                show={showProfileModal}
                onHide={() => setShowProfileModal(false)}
                borrowerId={borrower_id}
                profileData={profileData}
            />

            {/* Verification Action Modal */}
            <VerificationActionModal
                show={showActionModal}
                onHide={() => setShowActionModal(false)}
                onConfirm={handleActionConfirm}
                actionType={actionType}
                loading={actionLoading}
                validationErrors={validationErrors}
            />
        </div>
    );
}
