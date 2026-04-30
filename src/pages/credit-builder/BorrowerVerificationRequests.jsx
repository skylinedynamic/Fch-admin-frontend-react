import React, { useEffect, useState, useCallback } from 'react';
import { Link, useParams, useLocation, useNavigate } from 'react-router-dom';
import { DataTable } from '../../components/Table/DataTableWrapper';
import { Column } from 'primereact/column';
import { Dropdown } from 'primereact/dropdown';
import { Calendar } from 'primereact/calendar';
import { FilterMatchMode, FilterOperator } from 'primereact/api';
import { UncontrolledTooltip } from 'reactstrap';
import { fetchBorrowerVerificationRequests, updateVerificationStatus, getBorrowerProfile } from '../../modules/verification-center/services'; // Import getBorrowerProfile
import BorrowerProfileModal from './components/BorrowerProfileModal'; // Import Modal
import VerificationActionModal from './components/VerificationActionModal'; // Import Action Modal
import ResponseDetailModal from './components/ResponseDetailModal'; // Import Result Modal
import { toast } from 'react-toastify';
import { VERIFICATION_STATUS } from '../../config/creditBuilder'; // Import Constants
import { useTiers } from '../../modules/tiers/queries';
import TableLoader from '../../components/Loader/TableLoader';
import BorrowerProfileBannerSkeleton from '../../components/Loader/BorrowerProfileBannerSkeleton';

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
    const [selectedStatus, setSelectedStatus] = useState('');
    const [appliedStatus, setAppliedStatus] = useState('');
    const [tiersList, setTiersList] = useState([]);


    const fetchProfileData = async () => {
        if (!borrower_id) return;
        setProfileLoading(true);
        try {
            const response = await getBorrowerProfile(borrower_id);
            if (response.status && response.data) {
                setProfileData(response.data);
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

        // Add class to body to prevent global scroll
        document.body.classList.add('table-page-fit-active');

        return () => {
            document.body.classList.remove('table-page-fit-active');
        };
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
        setSelectedTier('');
        setAppliedTier('');
        setSelectedStatus('');
        setAppliedStatus('');
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
    const [actionType, setActionType] = useState('api_verify'); // 'api_verify', 'manual_verify' or 'reject'
    const [selectedRequest, setSelectedRequest] = useState(null); // Single request (original logic)
    const [isBulkAction, setIsBulkAction] = useState(false); // Flag for bulk
    const [actionLoading, setActionLoading] = useState(false);
    const [validationErrors, setValidationErrors] = useState(null);

    // Response Detail Modal
    const [resultModalShow, setResultModalShow] = useState(false);
    const [verificationResults, setVerificationResults] = useState({ message: '', data: [] });

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

        try {
            const isReject = actionType === 'reject';
            const isApi = actionType === 'api_verify';

            const payload = {
                request_ids: requestsToProcess.map(req => req.id),
                status: isReject ? VERIFICATION_STATUS.REJECTED : VERIFICATION_STATUS.COMPLETED,
                note: reason,
                is_api: isApi
            };

            const result = await updateVerificationStatus(payload);

            if (result.status) {
                setVerificationResults({
                    message: result.message || 'Action processed successfully',
                    data: result.data || []
                });
                setShowActionModal(false);
                setResultModalShow(true); // Show the results modal
                loadRequests();
                setSelectedRequests([]);
            } else {
                toast.error(result.message || 'Failed to update requests');
            }

        } catch (err) {
            console.error('Action error', err);
            if (err.response && err.response.status === 422) {
                setValidationErrors(err.response.data.errors);
            } else {
                toast.error('An unexpected error occurred processing requests.');
            }
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

    const dayCountTemplate = (rowData) => {
        if (!rowData.request_date) return <span className="text-muted">—</span>;
        const requestDate = new Date(rowData.request_date);
        const today = new Date();
        const diffTime = today - requestDate;
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        let badgeClass = 'bg-success-subtle text-success';
        if (diffDays > 30) badgeClass = 'bg-danger-subtle text-danger';
        else if (diffDays > 7) badgeClass = 'bg-warning-subtle text-warning';
        return (
            <span className={`badge ${badgeClass} fs-11`}>
                {diffDays === 0 ? 'Today' : `${diffDays} ${diffDays === 1 ? 'day' : 'days'}`}
            </span>
        );
    };

    const actionBodyTemplate = (rowData) => {
        // Show buttons only for processing status, otherwise show status with note icon if exists
        if (rowData.status === VERIFICATION_STATUS.PROCESSING) {
            return (
                <div className="d-flex gap-2 justify-content-center">
                    {rowData.tier_code === 'T0' && rowData.has_api && (
                        <button
                            className="btn btn-sm btn-soft-primary"
                            onClick={() => openActionModal('api_verify', rowData)}
                            title="MicroBilt Verification"
                        >
                            MicroBilt Verification
                        </button>
                    )}

                    <button
                        className="btn btn-sm btn-soft-success"
                        onClick={() => openActionModal('manual_verify', rowData)}
                        title="Manual Verification"
                    >
                        Manual Verification
                    </button>
                    <button
                        className="btn btn-sm btn-soft-danger"
                        onClick={() => openActionModal('reject', rowData)}
                        title="Reject"
                    >
                        Reject
                    </button>
                </div>
            );
        }

        // For other statuses (Complete, Rejected, Pending), show badge with Note icon in Action column
        let badgeClass = 'bg-info-subtle text-info';
        if (rowData.status === VERIFICATION_STATUS.PENDING) badgeClass = 'bg-warning-subtle text-warning';
        if (rowData.status === VERIFICATION_STATUS.COMPLETED) badgeClass = 'bg-success-subtle text-success';
        if (rowData.status === VERIFICATION_STATUS.REJECTED) badgeClass = 'bg-danger-subtle text-danger';

        const tooltipContent = (rowData.status === VERIFICATION_STATUS.COMPLETED || rowData.status === VERIFICATION_STATUS.REJECTED)
            ? (rowData.note || rowData.rejection_reason)
            : null;

        const tooltipId = `action-note-${rowData.id}`;

        return (
            <div className="d-flex align-items-center justify-content-center gap-2">
                <span className={`badge ${badgeClass} fs-12 text-capitalize`}>
                    {rowData.status}
                </span>
                {tooltipContent && (
                    <>
                        <button
                            className="btn btn-sm btn-icon btn-soft-info border-0 rounded-circle p-0"
                            id={tooltipId}
                            type="button"
                            style={{ width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                            <i className="ri-sticky-note-line fs-14"></i>
                        </button>
                        <UncontrolledTooltip placement="top" target={tooltipId} container="body">
                            {tooltipContent}
                        </UncontrolledTooltip>
                    </>
                )}
            </div>
        );
    };

    return (
        <div className="page-content page-content-fit">
            <div className="container-fluid">
                <div className="row pb-1">
                    <div className="col-12">
                        <div className="d-flex align-items-center justify-content-between flex-row py-2">
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
                                                    onClick={() => openActionModal('api_verify')}
                                                >
                                                    MicroBilt Bulk Verification
                                                </button>
                                            </li>
                                            <li>
                                                <button
                                                    type="button"
                                                    className="dropdown-item"
                                                    onClick={() => openActionModal('manual_verify')}
                                                >
                                                    Manual Bulk Verification
                                                </button>
                                            </li>
                                            <li>
                                                <button
                                                    type="button"
                                                    className="dropdown-item text-danger"
                                                    onClick={() => openActionModal('reject')}
                                                >
                                                    Manual Bulk Rejection
                                                </button>
                                            </li>
                                        </ul>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>



                <div className="row row-table-fit">
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

                                {profileLoading ? (
                                    <BorrowerProfileBannerSkeleton />
                                ) : (
                                    <div className="borrower-profile-banner">
                                        <div className="borrower-profile-banner-body">
                                            {/* Decorative backgrounds */}


                                            <div className="row align-items-center position-relative">
                                                <div className="col-auto">
                                                    <div className="avatar-md p-1 bg-white rounded-circle shadow-sm">
                                                        <div className="avatar-title bg-primary rounded-circle fs-24">
                                                            {profileData?.first_name ? profileData.first_name.charAt(0).toUpperCase() : 'B'}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="col">
                                                    <div className="ps-2">
                                                        <div className="row g-0 align-items-center">
                                                            <div className="col-md-6 border-end-md pe-md-4">
                                                                <span className="text-muted text-uppercase fw-semibold fs-11 d-block mb-1">Borrower Name</span>
                                                                <div className="d-flex align-items-center">
                                                                    <>
                                                                        <h4 className="fs-16 mb-0 fw-bold text-primary">{profileData?.full_name || 'N/A'}</h4>
                                                                        {profileData?.status && <span className="badge bg-success-subtle text-success ms-2 fs-10 text-uppercase">{profileData.status}</span>}
                                                                    </>
                                                                </div>
                                                            </div>
                                                            <div className="col-md-6 ps-md-4">
                                                                <span className="text-muted text-uppercase fw-semibold fs-11 d-block mb-1">Partner Name</span>
                                                                <div className="d-flex align-items-center">
                                                                    <i className="ri-building-line me-2 text-primary fs-16"></i>
                                                                    <h5 className="fs-14 mb-0 fw-medium text-dark-emphasis">{profileData?.partner_name || 'N/A'}</h5>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <p className="text-muted mb-0 fs-12">
                                                                <h6 className="fs-14 mb-0 fw-medium text-info">
                                                                </h6>        </p>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="col-lg-auto mt-lg-0 border-start-lg ps-lg-4">
                                                    <div className="d-flex gap-4">
                                                        <div className="text-center">
                                                            <p className="text-muted text-uppercase fw-semibold fs-11 mb-1">Total Requests</p>
                                                            <h6 className="mb-0 fw-bold">{totalRecords}</h6>
                                                        </div>
                                                    </div>
                                                    <div className="text-center">
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
                                )}



                                {loading ? (
                                    <TableLoader
                                        rows={10}
                                        columns={[
                                            { style: { width: '3%' } },
                                            { style: { width: '28%' } },
                                            { style: { width: '10%' } },
                                            { style: { width: '13%' } },
                                            { style: { width: '12%' } },
                                            { style: { width: '10%' } },
                                            { style: { width: '27%' } }
                                        ]}
                                    />
                                ) : (
                                    <DataTable
                                        scrollable
                                        scrollHeight="flex"
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
                                            style={{ width: '28%' }}
                                        />
                                        <Column
                                            field="tier_name"
                                            header="Tier"
                                            sortable
                                            filter
                                            filterElement={tierFilterTemplate}
                                            showFilterMatchModes={false}
                                            filterPlaceholder="Search Tier"
                                            style={{ width: '10%' }}
                                            body={(rowData) => <span className="badge bg-info-subtle text-info fs-11">{rowData.tier_name}</span>}
                                        />
                                        <Column
                                            field="status"
                                            header="Status"
                                            body={statusTemplate}
                                            sortable
                                            showFilterMatchModes={false}
                                            style={{ width: '13%' }}
                                        />
                                        <Column
                                            field="request_date"
                                            header="Request Date"
                                            sortable
                                            filter
                                            showFilterMatchModes={false}
                                            filterElement={dateFilterTemplate}
                                            filterPlaceholder="Search Date"
                                            style={{ width: '12%' }}
                                            body={(rowData) => <span className="text-muted">{rowData.request_date}</span>}
                                        />
                                        <Column
                                            header="Day Count"
                                            body={dayCountTemplate}
                                            sortable
                                            alignHeader={'center'}
                                            style={{ width: '10%', textAlign: 'center' }}
                                        />
                                        <Column
                                            sortable
                                            header="Action"
                                            body={actionBodyTemplate}
                                            alignHeader={'center'}
                                            style={{ minWidth: '14rem', textAlign: 'center', width: '27%' }}
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
                isBulk={isBulkAction}
                count={isBulkAction ? selectedRequests.length : 1}
            />

            {/* Response Detail Modal */}
            <ResponseDetailModal
                show={resultModalShow}
                onHide={() => setResultModalShow(false)}
                message={verificationResults.message}
                data={verificationResults.data}
            />
        </div>
    );
}

