import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { DataTable } from '../../components/Table/DataTableWrapper';
import { Column } from 'primereact/column';
import { Dropdown } from 'primereact/dropdown';
import { FilterMatchMode, FilterOperator } from 'primereact/api';
import { fetchLeads, deleteLead, convertLead, updateLeadContactInfo } from '../../modules/leads/services';
import { allUsers } from '../../modules/partner/services';
import { usePermissions } from '../../lib/auth/usePermissions';
import { useAuthStore } from '../../store/auth/authStore';
import DeleteConfirmationModal from '../../components/Common/Modals/DeleteConfirmationModal';
import StatisticsCard from '../../components/Common/StatisticsCard';
import StatisticsCardSkeleton from '../../components/Common/StatisticsCardSkeleton';
import TableLoader from '../../components/Loader/TableLoader';
import FilterLoader from '../../components/Loader/FilterLoader';
import { toast } from 'react-toastify';
import { LEAD_TYPE_OPTIONS, LEAD_STATUS_OPTIONS } from '../../config/leadOptions';
import { ENTITY_TYPE_PARTNER, ENTITY_TYPE_BORROWER } from '../../config/appConfig';
import LeadConvertModal from './components/LeadConvertModal';
import LeadMissingInfoModal from './components/LeadMissingInfoModal';
import LeadPaymentModal from './components/LeadPaymentModal';

export default function Leads() {
    const navigate = useNavigate();
    const { hasPermission } = usePermissions();
    const currentUser = useAuthStore((state) => state.user);
    const isHost = currentUser?.is_host == 1;

    // State for leads
    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Pagination state
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    const [totalRecords, setTotalRecords] = useState(0);

    // Sorting state
    const [sortField, setSortField] = useState('id');
    const [sortOrder, setSortOrder] = useState('desc');

    // Filter states
    const [searchText, setSearchText] = useState('');
    const [selectedLeadType, setSelectedLeadType] = useState('');
    const [selectedStatus, setSelectedStatus] = useState('');
    const [selectedSalesperson, setSelectedSalesperson] = useState('');
    const [filters, setFilters] = useState({});
    const [appliedSearchText, setAppliedSearchText] = useState('');
    const [appliedLeadType, setAppliedLeadType] = useState('');
    const [appliedStatus, setAppliedStatus] = useState('');
    const [appliedSalesperson, setAppliedSalesperson] = useState('');
    const [appliedFilters, setAppliedFilters] = useState({});

    // Checkbox selection state
    const [selectedLeads, setSelectedLeads] = useState([]);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteRows, setDeleteRows] = useState([]);

    // Dropdown data
    const [salespersonsList, setSalespersonsList] = useState([]);

    // Conversion Modal state
    const [showConvertModal, setShowConvertModal] = useState(false);
    const [showMissingInfoModal, setShowMissingInfoModal] = useState(false);
    const [targetLead, setTargetLead] = useState(null);
    const [conversionLoading, setConversionLoading] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [convertErrors, setConvertErrors] = useState({});
    const [missingInfoErrors, setMissingInfoErrors] = useState({});

    // Statistics data
    const [stats, setStats] = useState({
        total_leads: 0,
        new_leads: 0,
        qualified_rate: '0',
        declined_rate: '0'
    });
    const [newBorrowerId, setNewBorrowerId] = useState(null);
    const [paymentAmount, setPaymentAmount] = useState(0);
    const [paymentInvoiceId, setPaymentInvoiceId] = useState(null);

    // Initialize filters
    const initFilters = () => {
        const initial = {
            global: { value: null, matchMode: FilterMatchMode.CONTAINS },
            opportunity: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
            contact_person: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
            email: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
            status: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.EQUALS }] },
            lead_type: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.EQUALS }] },
            salesperson_name: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
            phone_number: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
        };
        setFilters(initial);
        setAppliedFilters(initial);
    };

    // Initialize on mount
    useEffect(() => {
        initFilters();

        // Load salespersons
        const loadSalespersons = async () => {
            try {
                const result = await allUsers();
                if (result.status) {
                    setSalespersonsList(result.data.map(user => ({
                        label: user.name,
                        value: user.id
                    })));
                }
            } catch (err) {
                console.error('Failed to load salespersons:', err);
            }
        };
        loadSalespersons();
    }, []);

    const statisticsConfig = [
        { title: "Total Leads", dataKey: "total_leads", icon: "ri-coupon-line", colorVariant: "secondary" },
        { title: "New Leads", dataKey: "new_leads", icon: "ri-folder-open-line", colorVariant: "warning" },
        { title: "Qualified Rate", dataKey: "qualified_rate", icon: "ri-time-line", colorVariant: "info" },
        { title: "Declined Rate", dataKey: "declined_rate", icon: "ri-star-line", colorVariant: "success" }
    ];

    // Load leads data with filters
    useEffect(() => {
        if (!appliedFilters || Object.keys(appliedFilters).length === 0) return;

        const load = async () => {
            setLoading(true);
            try {
                const payload = {
                    search: appliedSearchText || '',
                    lead_type: appliedLeadType || '',
                    status: appliedStatus || '',
                    salesperson_id: appliedSalesperson || '',
                    filters: appliedFilters,
                    page,
                    per_page: perPage,
                    sort_field: sortField,
                    sort_order: sortOrder,
                };

                const result = await fetchLeads(payload);
                if (result.status) {
                    setLeads(result.data || []);
                    setTotalRecords(result.meta?.total || (result.data ? result.data.length : 0));

                    // Update statistics from the same response
                    if (result.statistics) {
                        setStats(result.statistics);
                    }

                    setError(null);
                } else {
                    setError(result.message || 'Failed to fetch leads');
                    toast.error(result.message || 'Failed to fetch leads');
                }
            } catch (err) {
                setError(err.message || 'Failed to fetch leads');
                toast.error(err.message || 'Failed to fetch leads');
            } finally {
                setLoading(false);
            }
        };

        const timeout = setTimeout(() => {
            load();
        }, 300);

        return () => clearTimeout(timeout);
    }, [appliedSearchText, appliedLeadType, appliedStatus, appliedSalesperson, appliedFilters, page, perPage, sortField, sortOrder]);

    // Filter handlers
    const handleApplyFilters = () => {
        setAppliedSearchText(searchText);
        setAppliedLeadType(selectedLeadType);
        setAppliedStatus(selectedStatus);
        setAppliedSalesperson(selectedSalesperson);
        setAppliedFilters(filters);
        setPage(1);
    };

    const handleClearFilters = () => {
        setSearchText('');
        setSelectedLeadType('');
        setSelectedStatus('');
        setSelectedSalesperson('');
        setAppliedSearchText('');
        setAppliedLeadType('');
        setAppliedStatus('');
        setAppliedSalesperson('');
        initFilters();
        setPage(1);
    };

    // Pagination handler
    const onPage = (event) => {
        const nextPerPage = event.rows;
        const nextPage = Math.floor(event.first / event.rows) + 1;
        setPerPage(nextPerPage);
        setPage(nextPage);
    };

    // Sort handler
    const onSort = (event) => {
        const field = event.sortField;
        const order = event.sortOrder === 1 ? 'asc' : 'desc';
        setSortField(field || sortField);
        setSortOrder(order);
    };

    // Filter handler
    const onFilter = (e) => {
        setFilters(e.filters);
        setAppliedFilters(e.filters);
        setPage(1);
    };

    // Template body
    const statusBodyTemplate = (rowData) => {
        const statusMap = {
            'new lead': 'bg-primary-subtle text-primary',
            'contact initiated': 'bg-info-subtle text-info',
            'lead identified': 'bg-secondary-subtle text-secondary',
            'meeting arranged': 'bg-warning-subtle text-warning',
            'application allowed': 'bg-info-subtle text-info',
            'follow up': 'bg-primary-subtle text-primary',
            'negotiation': 'bg-warning-subtle text-warning',
            'lead completed': 'bg-success-subtle text-success',
            'lead declined': 'bg-danger-subtle text-danger',
            'qualified': 'bg-success-subtle text-success',
            'declined': 'bg-danger-subtle text-danger',
            'procrastination': 'bg-danger-subtle text-danger'
        };
        const className = statusMap[rowData.status?.toLowerCase()] || 'bg-light text-body';
        return <span className={`badge ${className} text-uppercase`}>{rowData.status}</span>;
    };

    const opportunityBodyTemplate = (rowData) => {
        return (
            <span className="fw-medium">
                {rowData.opportunity}
            </span>
        );
    };

    const nullSafeBodyTemplate = (rowData, field) => {
        const value = rowData[field];
        return value && value.trim() !== '' ? value : <span className="text-muted">Null</span>;
    };

    // Delete handlers
    const openDeleteModal = () => {
        if (!selectedLeads || selectedLeads.length === 0) {
            toast.warn('Please select at least one lead to delete.');
            return;
        }
        setDeleteRows(selectedLeads);
        setShowDeleteModal(true);
    };

    const handleDeleteConfirm = async () => {
        try {
            setLoading(true);
            for (const lead of deleteRows) {
                await deleteLead(lead.id);
            }
            toast.success('Leads deleted successfully');
            setShowDeleteModal(false);
            setSelectedLeads([]);
            setAppliedFilters({ ...appliedFilters });
        } catch (err) {
            console.error('Delete lead error:', err);
            const errorMessage = err.response?.data?.message || 'Failed to delete leads';
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const openConvertModal = (rowData) => {
        setTargetLead(rowData);
        const hasName = rowData.contact_person || rowData.contact_person;
        const isMissingInfo = !hasName || !rowData.email || !rowData.phone_number || !rowData.country || !rowData.state || !rowData.city;
        if (isMissingInfo) {
            setShowMissingInfoModal(true);
        } else {
            setShowConvertModal(true);
        }
    };

    const handleMissingInfoConfirm = async (updatedData) => {
        if (!targetLead?.id) {
            toast.error('Lead ID is missing');
            return;
        }
        try {
            setConversionLoading(true);
            await updateLeadContactInfo(targetLead.id, updatedData);
            setTargetLead({ ...targetLead, ...updatedData });
            setMissingInfoErrors({});
            setShowMissingInfoModal(false);
            setShowConvertModal(true);
        } catch (err) {
            console.error('Update missing info error:', err);
            const backendFieldErrors = err.response?.data?.errors;
            if (backendFieldErrors && typeof backendFieldErrors === 'object') {
                const flatErrors = {};
                Object.keys(backendFieldErrors).forEach(key => {
                    const val = backendFieldErrors[key];
                    flatErrors[key] = Array.isArray(val) ? val[0] : val;
                });
                setMissingInfoErrors(flatErrors);
            } else {
                toast.error(err.response?.data?.message || 'Failed to update lead information');
            }
        } finally {
            setConversionLoading(false);
        }
    };

    const handleConvertLeadConfirm = async (payload = {}) => {
        if (!targetLead) return;

        setConvertErrors({});
        const targetType = targetLead.lead_type == ENTITY_TYPE_PARTNER ? ENTITY_TYPE_PARTNER : ENTITY_TYPE_BORROWER;
        try {
            setConversionLoading(true);
            const response = await convertLead(targetLead.id, payload);

            if (response.status || response.id) {
                const bId = response.data?.borrower?.id || response.data?.id || response.id;
                const invId = response.data?.invoice?.id || null;

                // If it's a borrower and there's an amount to pay, and no payment yet, and user is NOT a host
                if (!isHost && targetType == ENTITY_TYPE_BORROWER && payload?.amount > 0 && !payload?.payment_intent_id) {
                    setNewBorrowerId(bId);
                    setPaymentAmount(payload.amount);
                    setPaymentInvoiceId(invId);
                    setShowConvertModal(false);
                    // Add a small delay for LeadConvertModal to close before showing LeadPaymentModal
                    setTimeout(() => {
                        setShowPaymentModal(true);
                    }, 300);
                    toast.success(`Lead successfully converted. Please complete the payment.`);
                    return;
                }

                toast.success(`Lead successfully converted to ${targetType}`);
                setAppliedFilters({ ...appliedFilters });
                setShowConvertModal(false);
                setShowPaymentModal(false);
            }
        } catch (err) {
            console.error('Conversion error:', err);
            // Extract backend validation errors and show them inline in the modal
            const backendFieldErrors = err.response?.data?.errors;
            if (backendFieldErrors && typeof backendFieldErrors === 'object') {
                // Flatten array values (Laravel returns arrays per field)
                const flatErrors = {};
                Object.keys(backendFieldErrors).forEach(key => {
                    const val = backendFieldErrors[key];
                    flatErrors[key] = Array.isArray(val) ? val[0] : val;
                });
                setConvertErrors(flatErrors);
            } else {
                toast.error(err.response?.data?.message || `Failed to convert lead to ${targetType}`);
            }
        } finally {
            setConversionLoading(false);
        }
    };

    const handleFieldChange = (fields) => {
        setConvertErrors(prev => {
            const next = { ...prev };
            fields.forEach(field => delete next[field]);
            return next;
        });
    };

    return (
        <div className="page-content">
            <div className="container-fluid">
                {/* Header Section mirrored from Clients.jsx */}
                <div className="row page-subheader-sticky bg-body">
                    <div className="col-12">
                        <div className="d-flex align-items-center justify-content-between flex-row py-2">
                            <div className="flex-grow-1">
                                <h4 className="fs-20 mb-1">Leads</h4>
                                <nav aria-label="breadcrumb" className="d-none d-sm-block">
                                    <ol className="breadcrumb m-0">
                                        <li className="breadcrumb-item"><Link to="/">Dashboard</Link></li>
                                        <li className="breadcrumb-item active" aria-current="page">Leads</li>
                                    </ol>
                                </nav>
                            </div>
                            <div className="mt-0">
                                <div className="d-flex align-items-center gap-2">
                                    <div className="btn-group">
                                        {hasPermission('delete leads') && Array.isArray(selectedLeads) && selectedLeads.length > 0 ? (
                                            <>
                                                <button type="button" className="btn bg-success text-white fw-medium">Actions</button>
                                                <button type="button" className="btn bg-success text-white fw-medium dropdown-toggle dropdown-toggle-split" data-bs-toggle="dropdown" aria-expanded="false">
                                                    <span className="visually-hidden">Toggle Dropdown</span>
                                                </button>
                                                <ul className="dropdown-menu dropdown-menu-end">
                                                    <li>
                                                        <button type="button" className="dropdown-item text-danger" onClick={openDeleteModal}>
                                                            <i className="ri-delete-bin-6-line me-1 align-bottom"></i> Delete Selected
                                                        </button>
                                                    </li>
                                                </ul>
                                            </>
                                        ) : hasPermission('create leads') ? (
                                            <button
                                                type="button"
                                                className="btn btn-primary fw-medium waves-effect waves-light"
                                                onClick={() => navigate('/leads/create')}
                                            >
                                                <i className="ri-add-fill me-1 align-bottom"></i> Add Lead
                                            </button>
                                        ) : null}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Statistics Cards */}
                <div className="row">
                    {loading ? (
                        [1, 2, 3, 4].map(i => <StatisticsCardSkeleton key={i} />)
                    ) : (
                        statisticsConfig.map((config, index) => {
                            const value = config.dataKey === 'total_leads' ? (totalRecords || 0) : stats[config.dataKey];
                            return (
                                <StatisticsCard
                                    key={index}
                                    title={config.title}
                                    count={config.dataKey.includes('rate') ? `${value}%` : value}
                                    icon={config.icon}
                                    colorVariant={config.colorVariant}
                                />
                            );
                        })
                    )}
                </div>

                {/* Filters and Table mirrored from Clients.jsx */}
                <div className="row">
                    <div className="col-lg-12">
                        <div className="card">
                            <div className="card-body">
                                <form onSubmit={(e) => {
                                    e.preventDefault();
                                    handleApplyFilters();
                                }}>
                                    {loading ? (
                                        <FilterLoader config={[
                                            { col: "col-xxl-3 col-sm-12" }, // Search
                                            ...(isHost ? [{ col: "col-xxl-2 col-sm-4" }] : []), // Lead Type
                                            { col: `col-xxl-${isHost ? '2' : '3'} col-sm-4` }, // Status
                                            { col: `col-xxl-${isHost ? '2' : '3'} col-sm-4` }, // Salesperson
                                            { col: "col-xxl-3 col-sm-12", isButton: true } // Buttons
                                        ]} />
                                    ) : (
                                        <div className="row g-3 mb-3">
                                            <div className="col-xxl-3 col-sm-12">
                                                <div className="search-box">
                                                    <input
                                                        type="text"
                                                        className="form-control search bg-light border-light"
                                                        placeholder="Search here..."
                                                        value={searchText}
                                                        onChange={(e) => setSearchText(e.target.value)}
                                                        onKeyDown={(e) => e.key === 'Enter' && handleApplyFilters()}
                                                    />
                                                    <i className="ri-search-line search-icon"></i>
                                                </div>
                                            </div>
                                            {isHost && (
                                                <div className="col-xxl-2 col-sm-4">
                                                    <Dropdown
                                                        value={selectedLeadType}
                                                        options={[{ label: 'All Lead Types', value: '' }, ...LEAD_TYPE_OPTIONS]}
                                                        onChange={(e) => setSelectedLeadType(e.value)}
                                                        placeholder="All Lead Types"
                                                        className="w-100 employee-filter-dropdown"
                                                    />
                                                </div>
                                            )}
                                            <div className={`col-xxl-${isHost ? '2' : '3'} col-sm-4`}>
                                                <Dropdown
                                                    value={selectedStatus}
                                                    options={[{ label: 'All Status', value: '' }, ...LEAD_STATUS_OPTIONS]}
                                                    onChange={(e) => setSelectedStatus(e.value)}
                                                    placeholder="All Status"
                                                    className="w-100 employee-filter-dropdown"
                                                />
                                            </div>
                                            <div className={`col-xxl-${isHost ? '2' : '3'} col-sm-4`}>
                                                <Dropdown
                                                    value={selectedSalesperson}
                                                    options={[{ label: 'All Lead Owner', value: '' }, ...salespersonsList]}
                                                    onChange={(e) => setSelectedSalesperson(e.value)}
                                                    placeholder="All Lead Owner"
                                                    filter
                                                    className="w-100 employee-filter-dropdown"
                                                />
                                            </div>
                                            <div className="col-xxl-3 col-sm-12">
                                                <div className="d-flex gap-2">
                                                    <button type="button" className="btn btn-warning flex-grow-1" onClick={handleApplyFilters}>
                                                        <i className="ri-equalizer-fill me-1 align-bottom"></i> Filters
                                                    </button>
                                                    <button type="button" className="btn btn-default flex-grow-1" onClick={handleClearFilters}>
                                                        <i className="ri-close-line me-1 align-bottom"></i> Clear
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </form>

                                {loading ? (
                                    <TableLoader rows={10} columns={new Array(10).fill({ style: { minWidth: '100px' } })} />
                                ) : (
                                    <div className="table-responsive table-card mt-1">
                                        <DataTable
                                            scrollable
                                            scrollHeight="510px"
                                            value={leads}
                                            paginator
                                            lazy
                                            totalRecords={totalRecords}
                                            first={(page - 1) * perPage}
                                            rows={perPage}
                                            rowsPerPageOptions={[10, 25, 50, 100]}
                                            sortMode="single"
                                            sortField={sortField}
                                            sortOrder={sortOrder === 'asc' ? 1 : -1}
                                            filterDisplay="menu"
                                            filters={filters}
                                            onFilter={onFilter}
                                            onPage={onPage}
                                            onSort={onSort}
                                            selection={selectedLeads}
                                            onSelectionChange={(e) => setSelectedLeads(e.value)}
                                            dataKey="id"
                                            onRowClick={(e) => {
                                                const isCheckbox = e.originalEvent.target.closest('.p-checkbox') ||
                                                    e.originalEvent.target.closest('.p-selection-column') ||
                                                    e.originalEvent.target.closest('.btn'); // Don't navigate if button clicked
                                                if (!isCheckbox) navigate(`/leads/${e.data.id}`);
                                            }}
                                            responsiveLayout="scroll"
                                            className="p-datatable-sm"
                                            emptyMessage="No leads found"
                                        >
                                            {hasPermission('delete leads') && <Column selectionMode="multiple" headerStyle={{ width: '3rem' }} />}
                                            {/* <Column field="opportunity" header="Opportunity" body={opportunityBodyTemplate} sortable filter filterPlaceholder="Search by opportunity" style={{ minWidth: '180px' }} /> */}
                                            <Column field="contact_person" header="Contact" body={(rowData) => nullSafeBodyTemplate(rowData, 'contact_person')} sortable filter showFilterMatchModes filterPlaceholder="Search by contact" style={{ minWidth: '160px' }} />
                                            <Column field="company_name" header="Company Name" body={(rowData) => nullSafeBodyTemplate(rowData, 'company_name')} sortable filter showFilterMatchModes filterPlaceholder="Search by organization" style={{ minWidth: '180px' }} />
                                            <Column field="email" header="Email" body={(rowData) => nullSafeBodyTemplate(rowData, 'email')} sortable filter showFilterMatchModes filterPlaceholder="Search by email" style={{ minWidth: '220px' }} />
                                            <Column field="phone_number" header="Phone" body={(rowData) => nullSafeBodyTemplate(rowData, 'phone_number')} sortable filter showFilterMatchModes filterPlaceholder="Search by phone" style={{ minWidth: '150px' }} />
                                            <Column field="salesperson_name" header="SalesPerson" body={(rowData) => nullSafeBodyTemplate(rowData, 'salesperson_name')} sortable filter showFilterMatchModes filterPlaceholder="Search by salesperson" style={{ minWidth: '160px' }} />
                                            {isHost && <Column field="lead_type" header="Type" body={(rowData) => nullSafeBodyTemplate(rowData, 'lead_type')} sortable filter showFilterMatchModes filterPlaceholder="Search by type" style={{ minWidth: '130px' }} />}
                                            <Column field="status" header="Status" body={statusBodyTemplate} sortable filter showFilterMatchModes filterPlaceholder="Search by status" style={{ minWidth: '140px' }} />
                                            <Column
                                                header="Action"
                                                body={(rowData) => {
                                                    const isConverted = !!rowData.convert_to;
                                                    const emailAlreadyConvertedTo = rowData.convert_email_already;
                                                    const targetType = rowData.convert_to || (rowData.lead_type === 'Partner' ? 'Partner' : 'Borrower');

                                                    // This lead itself is converted
                                                    if (isConverted) {
                                                        return (
                                                            <div className="d-flex">
                                                                <span className="badge bg-success-subtle text-success fs-12 p-2" style={{ whiteSpace: 'nowrap' }}>
                                                                    <i className="ri-checkbox-circle-line align-middle me-1"></i>
                                                                    Converted as a {targetType}
                                                                </span>
                                                            </div>
                                                        );
                                                    }

                                                    // Another instance of this email was converted
                                                    if (emailAlreadyConvertedTo) {
                                                        return (
                                                            <div className="d-flex">
                                                                <span className="badge bg-success-subtle text-success fs-12 p-2" style={{ whiteSpace: 'nowrap' }}>
                                                                    <i className="ri-checkbox-circle-line align-middle me-1"></i>
                                                                    Already a {emailAlreadyConvertedTo}
                                                                </span>
                                                            </div>
                                                        );
                                                    }

                                                    // Otherwise show the convert button
                                                    return (
                                                        <div className="d-flex">
                                                            <button
                                                                className={`btn ${targetType === 'Partner' ? 'btn-info' : 'btn-primary'} btn-sm waves-effect waves-light fw-medium border-0 btn-hover-custom`}
                                                                onClick={(e) => { e.stopPropagation(); openConvertModal(rowData); }}
                                                                style={{ whiteSpace: 'nowrap' }}
                                                            >
                                                                <i className={`${targetType === 'Partner' ? 'ri-shake-hands-line' : 'ri-user-add-line'} align-middle me-1`}></i>
                                                                Convert to {targetType}
                                                            </button>
                                                        </div>
                                                    );
                                                }}
                                            />
                                        </DataTable>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <LeadConvertModal
                    show={showConvertModal}
                    onHide={() => { setShowConvertModal(false); setConvertErrors({}); }}
                    onConfirm={handleConvertLeadConfirm}
                    lead={targetLead}
                    targetType={targetLead?.lead_type == ENTITY_TYPE_PARTNER ? ENTITY_TYPE_PARTNER : ENTITY_TYPE_BORROWER}
                    loading={conversionLoading}
                    isHost={isHost}
                    backendErrors={convertErrors}
                    onFieldChange={handleFieldChange}
                />

                <LeadMissingInfoModal
                    show={showMissingInfoModal}
                    onHide={() => { setShowMissingInfoModal(false); setMissingInfoErrors({}); }}
                    onConfirm={handleMissingInfoConfirm}
                    lead={targetLead}
                    targetType={targetLead?.lead_type == ENTITY_TYPE_PARTNER ? ENTITY_TYPE_PARTNER : ENTITY_TYPE_BORROWER}
                    loading={conversionLoading}
                    backendErrors={missingInfoErrors}
                />

                <LeadPaymentModal
                    show={showPaymentModal}
                    onHide={() => setShowPaymentModal(false)}
                    onSuccess={() => {
                        setShowPaymentModal(false);
                        // toast.success("Lead conversion and payment completed successfully!");
                        setAppliedFilters({ ...appliedFilters });
                    }}
                    lead={targetLead}
                    borrowerId={newBorrowerId}
                    invoiceId={paymentInvoiceId}
                    amount={paymentAmount}
                />

                <DeleteConfirmationModal
                    show={showDeleteModal}
                    onConfirm={handleDeleteConfirm}
                    onClose={() => setShowDeleteModal(false)}
                    loading={loading}
                    text="The selected leads and all associated data will be deleted."
                />
            </div>
        </div>
    );
}