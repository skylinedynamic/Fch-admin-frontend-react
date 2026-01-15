import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { DataTable } from '../../components/Table/DataTableWrapper';
import { Column } from 'primereact/column';
import { Dropdown } from 'primereact/dropdown';
import { FilterMatchMode, FilterOperator } from 'primereact/api';
import { fetchLeads, deleteLead, fetchLeadStats, convertLead, updateLead } from '../../modules/leads/services';
import { allUsers } from '../../modules/partner/services';
import { usePermissions } from '../../lib/auth/usePermissions';
import { useAuthStore } from '../../store/auth/authStore';
import DeleteConfirmationModal from '../../components/Common/Modals/DeleteConfirmationModal';
import StatisticsCard from '../../components/Common/StatisticsCard';
import StatisticsCardSkeleton from '../../components/Common/StatisticsCardSkeleton';
import TableLoader from '../../components/Loader/TableLoader';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { LEAD_TYPE_OPTIONS, LEAD_STATUS_OPTIONS } from '../../config/leadOptions';
import LeadConvertModal from './components/LeadConvertModal';
import LeadMissingInfoModal from './components/LeadMissingInfoModal';

export default function Leads() {
    const navigate = useNavigate();
    const { hasPermission } = usePermissions();
    const currentUser = useAuthStore((state) => state.user);
    const isHost = currentUser?.is_host === 1;
    
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

    // Statistics data
    const [stats, setStats] = useState({
        total_leads: 0,
        new_leads: 0,
        qualified_rate: '0%',
        declined_rate: '0%'
    });
    const [statsLoading, setStatsLoading] = useState(true);

    // Initialize filters
    const initFilters = () => {
        const initial = {
            global: { value: null, matchMode: FilterMatchMode.CONTAINS },
            opportunity: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
            contact_name: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
            email: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
            status: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.EQUALS }] },
            lead_type: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.EQUALS }] }
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

    // Load statistics
    useEffect(() => {
        const loadStats = async () => {
            try {
                setStatsLoading(true);
                const result = await fetchLeadStats();
                if (result.status && result.data) {
                    setStats(result.data);
                }
            } catch (err) {
                console.error('Failed to load lead statistics:', err);
            } finally {
                setStatsLoading(false);
            }
        };
        loadStats();
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
            'declined': 'bg-danger-subtle text-danger'
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
            toast.error('Failed to delete leads');
        } finally {
            setLoading(false);
        }
    };

    const openConvertModal = (rowData) => {
        setTargetLead(rowData);
        const hasName = rowData.contact_person || rowData.contact_name;
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
            await updateLead(targetLead.id, updatedData);
            setTargetLead({ ...targetLead, ...updatedData });
            setShowMissingInfoModal(false);
            setShowConvertModal(true);
        } catch (err) {
            console.error('Update missing info error:', err);
            toast.error(err.response?.data?.message || 'Failed to update lead information');
        } finally {
            setConversionLoading(false);
        }
    };

    const handleConvertLeadConfirm = async () => {
        if (!targetLead) return;
        const targetType = targetLead.lead_type === 'Partner' ? 'Partner' : 'Borrower';
        try {
            setConversionLoading(true);
            const response = await convertLead(targetLead.id);
            if (response.status && response.data?.id) {
                toast.success(`Lead successfully updated and converted to ${targetType}`);
                setAppliedFilters({ ...appliedFilters });
                setShowConvertModal(false);
            } else {
                toast.success(`Lead converted to ${targetType} successfully`);
                setAppliedFilters({ ...appliedFilters });
                setShowConvertModal(false);
            }
        } catch (err) {
            console.error('Conversion error:', err);
            toast.error(err.response?.data?.message || `Failed to convert lead to ${targetType}`);
        } finally {
            setConversionLoading(false);
        }
    };

    return (
        <div className="page-content">
            <ToastContainer position="top-right" autoClose={3000} />
            <div className="container-fluid">
                {/* Header Section mirrored from Clients.jsx */}
                <div className="row mb-3 pb-1 page-subheader-sticky bg-body">
                    <div className="col-12">
                        <div className="d-flex align-items-center justify-content-between flex-row">
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
                    {statsLoading ? (
                        [1, 2, 3, 4].map(i => <StatisticsCardSkeleton key={i} />)
                    ) : (
                        statisticsConfig.map((config, index) => (
                            <StatisticsCard
                                key={index}
                                title={config.title}
                                count={config.dataKey.includes('rate') ? `${stats[config.dataKey]}%` : stats[config.dataKey]}
                                icon={config.icon}
                                colorVariant={config.colorVariant}
                            />
                        ))
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
                                                options={[{ label: 'All Sales Person', value: '' }, ...salespersonsList]}
                                                onChange={(e) => setSelectedSalesperson(e.value)}
                                                placeholder="All Sales Person"
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
                                </form>

                                {loading ? (
                                    <TableLoader rows={10} columns={new Array(9).fill({ style: { minWidth: '100px' } })} />
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
                                            <Column field="contact_name" header="Contact" sortable filter filterPlaceholder="Search by contact" style={{ minWidth: '160px' }} />
                                            <Column field="email" header="Email" sortable filter filterPlaceholder="Search by email" style={{ minWidth: '220px' }} />
                                            <Column field="phone_number" header="Phone" sortable filter filterPlaceholder="Search by phone" style={{ minWidth: '150px' }} />
                                            <Column field="salesperson_name" header="SalesPerson" sortable filter filterPlaceholder="Search by salesperson" style={{ minWidth: '160px' }} />
                                            {isHost && <Column field="lead_type" header="Type" sortable filter filterPlaceholder="Search by type" style={{ minWidth: '130px' }} />}
                                            <Column field="status" header="Status" body={statusBodyTemplate} sortable filter filterPlaceholder="Search by status" style={{ minWidth: '140px' }} />
                                            <Column
                                            header="Action"
                                            body={(rowData) => {
                                                const isConverted = !!rowData.convert_to;
                                                const targetType = rowData.convert_to || (rowData.lead_type === 'Partner' ? 'Partner' : 'Borrower');
                                                return (
                                                    <div className="d-flex">
                                                        {isConverted ? (
                                                            <span className="badge bg-success-subtle text-success fs-12 p-2">
                                                                <i className="ri-checkbox-circle-line align-middle me-1"></i>
                                                                Already a {targetType}
                                                            </span>
                                                        ) : (
                                                            <button 
                                                                className={`btn ${targetType === 'Partner' ? 'bg-info-subtle text-info' : 'bg-primary-subtle text-primary'} btn-sm waves-effect waves-light fw-medium border-0`}
                                                                onClick={(e) => { e.stopPropagation(); openConvertModal(rowData); }}
                                                            >
                                                                <i className={`${targetType === 'Partner' ? 'ri-shake-hands-line' : 'ri-user-add-line'} align-middle me-1`}></i>
                                                                Convert to {targetType}
                                                            </button>
                                                        )}
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
                    onHide={() => setShowConvertModal(false)}
                    onConfirm={handleConvertLeadConfirm}
                    lead={targetLead}
                    targetType={targetLead?.lead_type === 'Partner' ? 'Partner' : 'Borrower'}
                    loading={conversionLoading}
                />

                <LeadMissingInfoModal
                    show={showMissingInfoModal}
                    onHide={() => setShowMissingInfoModal(false)}
                    onConfirm={handleMissingInfoConfirm}
                    lead={targetLead}
                    targetType={targetLead?.lead_type === 'Partner' ? 'Partner' : 'Borrower'}
                    loading={conversionLoading}
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
