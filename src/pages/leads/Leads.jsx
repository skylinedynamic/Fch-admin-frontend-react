import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PageHeader from '../common/PageHeader';
import { DataTable } from '../../components/Table/DataTableWrapper';
import { Column } from 'primereact/column';
import { Dropdown } from 'primereact/dropdown';
import { FilterMatchMode, FilterOperator } from 'primereact/api';
import { fetchLeads, deleteLeads, convertLead, updateLeadContactInfo } from '../../modules/leads/services';
import { fetchReferralPartners } from '../../modules/contact/services';
import { allUsers } from '../../modules/partner/services';
import { usePermissions } from '../../lib/auth/usePermissions';
import { useAuthStore } from '../../store/auth/authStore';
import DeleteConfirmationModal from '../../components/Common/Modals/DeleteConfirmationModal';
import DeleteBlockedModal from '../../components/Common/Modals/DeleteBlockedModal';
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
import PaidVersionOnlyModal from '../../components/Common/Modals/PaidVersionOnlyModal';

export default function Leads() {
    const navigate = useNavigate();
    const { hasPermission } = usePermissions();
    const currentUser = useAuthStore((state) => state.user);
    const userSubscription = useAuthStore((state) => state.userSubscription);
    const isHost = currentUser?.is_host == 1;

    // State for leads
    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showPaidOnlyModal, setShowPaidOnlyModal] = useState(false);

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
    // Converted leads in a delete selection: they are kept, and the user is told.
    const [convertedLeads, setConvertedLeads] = useState([]);
    const [convertedSelectionSize, setConvertedSelectionSize] = useState(0);

    // Dropdown data
    const [salespersonsList, setSalespersonsList] = useState([]);
    const [referralPartners, setReferralPartners] = useState([]);

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



        // Add class to body to prevent global scroll
        document.body.classList.add('table-page-fit-active');

        // Load salespersons and referral partners
        const loadInitialData = async () => {
            try {
                const [usersRes, referralRes] = await Promise.all([
                    allUsers(),
                    fetchReferralPartners()
                ]);
                if (usersRes.status) {
                    setSalespersonsList(usersRes.data.map(user => ({
                        label: user.name,
                        value: user.id
                    })));
                }
                setReferralPartners(referralRes || []);
            } catch (err) {
                console.error('Failed to load initial data:', err);
            }
        };
        loadInitialData();

        return () => {
            document.body.classList.remove('table-page-fit-active');
        };
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
        // A lead already converted to a client or partner cannot be deleted.
        const converted = selectedLeads
            .filter((lead) => !!lead.convert_to)
            .map((lead) => ({ id: lead.id, name: leadName(lead) }));
        if (converted.length > 0) {
            showConverted(converted, selectedLeads.length);
            return;
        }
        setDeleteRows(selectedLeads);
        setShowDeleteModal(true);
    };

    const leadName = (lead) => lead.contact_person || lead.company_name || lead.lead_id || `Lead #${lead.id}`;

    const showConverted = (rows, selectedCount) => {
        setConvertedLeads(rows);
        setConvertedSelectionSize(selectedCount);
    };

    const handleDeleteConfirm = async () => {
        try {
            setLoading(true);
            await deleteLeads(deleteRows.map((lead) => lead.id));
            toast.success('Leads deleted successfully');
            setShowDeleteModal(false);
            setSelectedLeads([]);
            setAppliedFilters({ ...appliedFilters });
        } catch (err) {
            // The API keeps converted leads (422 naming them) - same modal, no toast.
            const converted = err.response?.data?.errors?.converted;
            if (err.response?.status === 422 && Array.isArray(converted) && converted.length > 0) {
                setShowDeleteModal(false);
                showConverted(converted, deleteRows.length);
                return;
            }
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
                toast.success(`Lead successfully converted to ${targetType}`);
                setShowConvertModal(false);
                setAppliedFilters({ ...appliedFilters });
            }
        } catch (err) {
            console.error('Conversion error:', err);
            const backendFieldErrors = err.response?.data?.errors;
            if (backendFieldErrors && typeof backendFieldErrors === 'object') {
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
        <div className="page-content page-content-fit">
            <div className="container-fluid">
                {/* Header Section */}
                <PageHeader
                    title="Leads"
                    breadcrumbs={[{ label: 'Leads' }]}
                >
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
                </PageHeader>

                {/* Statistics Cards */}
                <div className="row lead-section">
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
                <div className="row row-table-fit">
                    <div className="col-lg-12">
                        <div className="card list-page-card">
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
                                            scrollHeight="flex"
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
                                            <Column
                                                header="Source"
                                                body={(rowData) => (
                                                    <div className="d-flex flex-column">
                                                        <span>{rowData.lead_source}</span>
                                                        {rowData.referral_partner_id != null && rowData.referral_partner_id !== '' && (
                                                            <div className="mt-1 d-flex align-items-center">
                                                                <span className="badge bg-light text-success border border-success-subtle fw-medium py-1 px-2 fs-11">
                                                                    <i className="ri-user-follow-line me-1"></i>
                                                                    {referralPartners.find(p => p.id === rowData.referral_partner_id)?.full_name || ''}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                                style={{ minWidth: '160px' }}
                                            />
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
                    text="The selected leads will be deleted."
                />

                <DeleteBlockedModal
                    show={convertedLeads.length > 0}
                    title={convertedLeads.length === 1 ? 'Lead Cannot Be Deleted' : 'Leads Cannot Be Deleted'}
                    message={
                        convertedLeads.length === 1
                            ? `${convertedSelectionSize === 1 ? 'This lead' : convertedLeads[0].name} has already been converted and cannot be deleted.`
                            : 'These leads have already been converted and cannot be deleted.'
                    }
                    items={convertedLeads}
                    note={
                        convertedSelectionSize > convertedLeads.length
                            ? `${convertedLeads.length === 1 ? 'Unselect this lead' : 'Unselect these leads'} to delete the other selected leads.`
                            : undefined
                    }
                    onClose={() => setConvertedLeads([])}
                />

                <PaidVersionOnlyModal
                    show={showPaidOnlyModal}
                    onHide={() => setShowPaidOnlyModal(false)}
                    message={
                        <>
                            This feature is only available in the <strong>Paid Version</strong>.
                            Please upgrade your plan to use this feature.
                        </>
                    }
                />

            </div>
        </div>
    );
}