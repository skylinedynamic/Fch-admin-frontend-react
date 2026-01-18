import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { DataTable } from '../../components/Table/DataTableWrapper';
import { Column } from 'primereact/column';
import { Dropdown } from 'primereact/dropdown';
import { FilterMatchMode, FilterOperator } from 'primereact/api';
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
import LeadConvertModal from '../leads/components/LeadConvertModal';
import LeadMissingInfoModal from '../leads/components/LeadMissingInfoModal';

// Demo Data
const DEMO_LEADS = [
    { 
        id: 1, 
        first_name: 'John', 
        last_name: 'Doe', 
        business_name: 'Doe Logistics LLC',
        email: 'john@doelogistics.com', 
        phone_number: '555-0101', 
        funding_requested_amount: 50000, 
        status: 'On Hold' 
    },
    { 
        id: 2, 
        first_name: 'Jane', 
        last_name: 'Smith', 
        business_name: 'Smith Consulting',
        email: 'jane@smithconsulting.com', 
        phone_number: '555-0102', 
        funding_requested_amount: 15000, 
        status: 'Pre-Qualified' 
    },
    { 
        id: 3, 
        first_name: 'Robert', 
        last_name: 'Johnson', 
        business_name: 'Johnson Bakery',
        email: 'rob@johnsonbakery.com', 
        phone_number: '555-0103', 
        funding_requested_amount: 75000, 
        status: 'Rejected' 
    },
    { 
        id: 4, 
        first_name: 'Emily', 
        last_name: 'Davis', 
        business_name: 'Davis Design Studio',
        email: 'emily@davisdesign.com', 
        phone_number: '555-0104', 
        funding_requested_amount: 25000, 
        status: 'Pending' 
    },
    { 
        id: 5, 
        first_name: 'Michael', 
        last_name: 'Wilson', 
        business_name: 'Wilson Auto Repair',
        email: 'mike@wilsonauto.com', 
        phone_number: '555-0105', 
        funding_requested_amount: 100000, 
        status: 'On Hold' 
    },
];

const DEMO_STATS = {
    total_leads: 5,
    new_leads: 1,
    qualified_rate: '20%',
    declined_rate: '20%'
};

export default function PreQualificationApplication() {
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
    const [stats, setStats] = useState(DEMO_STATS);
    const [statsLoading, setStatsLoading] = useState(true);

    // Initialize filters
    const initFilters = () => {
        const initial = {
            global: { value: null, matchMode: FilterMatchMode.CONTAINS },
            first_name: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
            last_name: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
            email: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
            status: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.EQUALS }] },
            business_name: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] }
        };
        setFilters(initial);
    };

    // Initialize
    useEffect(() => {
        initFilters();
        
        // Load demo salespersons
        setSalespersonsList([
            { label: 'Anna Adame', value: 1 },
            { label: 'Bob Wilson', value: 2 }
        ]);

        // Simulate stats loading
        setTimeout(() => {
            setStats(DEMO_STATS);
            setStatsLoading(false);
        }, 500);

    }, []);

    const statisticsConfig = [
        { title: "Total Leads", dataKey: "total_leads", icon: "ri-coupon-line", colorVariant: "secondary" },
        { title: "New Leads", dataKey: "new_leads", icon: "ri-folder-open-line", colorVariant: "warning" },
        { title: "Qualified Rate", dataKey: "qualified_rate", icon: "ri-time-line", colorVariant: "info" },
        { title: "Declined Rate", dataKey: "declined_rate", icon: "ri-star-line", colorVariant: "success" }
    ];

    // Load leads data (Demo)
    useEffect(() => {
        setLoading(true);
        // Simulate API delay
        setTimeout(() => {
            let filtered = [...DEMO_LEADS];

            if (searchText) {
                const lower = searchText.toLowerCase();
                filtered = filtered.filter(l => 
                    l.first_name?.toLowerCase().includes(lower) || 
                    l.last_name?.toLowerCase().includes(lower) || 
                    l.email?.toLowerCase().includes(lower) ||
                    l.phone_number?.toLowerCase().includes(lower) ||
                    l.business_name?.toLowerCase().includes(lower)
                );
            }
            if (selectedStatus) {
                filtered = filtered.filter(l => l.status === selectedStatus);
            }

            setLeads(filtered);
            setTotalRecords(filtered.length);
            setLoading(false);
        }, 500);
    }, [searchText, selectedLeadType, selectedStatus, page, perPage, sortField, sortOrder]);

    const handleApplyFilters = () => {
        // Trigger re-render/effect via state change if needed, but dependencies handle it
        setPage(1);
    };

    const handleClearFilters = () => {
        setSearchText('');
        setSelectedLeadType('');
        setSelectedStatus('');
        setSelectedSalesperson('');
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

    // Delete handlers
    const openDeleteModal = () => {
        if (!selectedLeads || selectedLeads.length === 0) {
            toast.warn('Please select at least one item to delete.');
            return;
        }
        setDeleteRows(selectedLeads);
        setShowDeleteModal(true);
    };

    const handleDeleteConfirm = async () => {
        try {
            setLoading(true);
            // Demo delete behavior
            const idsToDelete = deleteRows.map(r => r.id);
            setLeads(prev => prev.filter(l => !idsToDelete.includes(l.id)));
            
            toast.success('Applications deleted successfully (Demo)');
            setShowDeleteModal(false);
            setSelectedLeads([]);
        } catch (err) {
            toast.error('Failed to delete items');
        } finally {
            setLoading(false);
        }
    };

    const openConvertModal = (rowData) => {
        setTargetLead(rowData);
        // For demo, assume info is present
        setShowConvertModal(true);
    };

    const handleMissingInfoConfirm = async (updatedData) => {
       // Demo logic
       setTargetLead({ ...targetLead, ...updatedData });
       setShowMissingInfoModal(false);
       setShowConvertModal(true);
    };

    const handleConvertLeadConfirm = async () => {
        if (!targetLead) return;
        setConversionLoading(true);
        setTimeout(() => {
             toast.success(`Application converted successfully (Demo)`);
             setShowConvertModal(false);
             setConversionLoading(false);
        }, 1000);
    };

    return (
        <div className="page-content">
            <ToastContainer position="top-right" autoClose={3000} />
            <div className="container-fluid">
                {/* Header Section */}
                <div className="row mb-3 pb-1 page-subheader-sticky bg-body">
                    <div className="col-12">
                        <div className="d-flex align-items-center justify-content-between flex-row">
                            <div className="flex-grow-1">
                                <h4 className="fs-20 mb-1">Pre-Qualification Applications</h4>
                                <nav aria-label="breadcrumb" className="d-none d-sm-block">
                                    <ol className="breadcrumb m-0">
                                        <li className="breadcrumb-item"><Link to="/">Dashboard</Link></li>
                                        <li className="breadcrumb-item active" aria-current="page">Pre-Qualification Applications</li>
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
                                                <i className="ri-add-fill me-1 align-bottom"></i> Add Application
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
                                count={config.dataKey.includes('rate') ? `${stats[config.dataKey]}` : stats[config.dataKey]}
                                icon={config.icon}
                                colorVariant={config.colorVariant}
                            />
                        ))
                    )}
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
                                                                  e.originalEvent.target.closest('.btn'); 
                                                if (!isCheckbox) navigate(`/leads/${e.data.id}`);
                                            }}
                                            responsiveLayout="scroll"
                                            className="p-datatable-sm"
                                            emptyMessage="No applications found (Demo)"
                                        >
                                            {hasPermission('delete leads') && <Column selectionMode="multiple" headerStyle={{ width: '3rem' }} />}
                                            <Column header="Name" body={(rowData) => <span className="fw-medium">{rowData.first_name} {rowData.last_name}</span>} sortable style={{ minWidth: '160px' }} />
                                            <Column field="business_name" header="Business Name" sortable filter filterPlaceholder="Search business" style={{ minWidth: '180px' }} />
                                            <Column field="email" header="Email" sortable filter filterPlaceholder="Search by email" style={{ minWidth: '220px' }} />
                                            <Column field="phone_number" header="Phone" sortable filter filterPlaceholder="Search by phone" style={{ minWidth: '150px' }} />
                                            <Column header="Requested Amount" field="funding_requested_amount" body={(rowData) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(rowData.funding_requested_amount)} sortable style={{ minWidth: '160px' }} />
                                            <Column field="status" header="Status" body={statusBodyTemplate} sortable filter filterPlaceholder="Search by status" style={{ minWidth: '140px' }} />
                                            <Column
                                            header="Action"
                                            body={(rowData) => {
                                                const isConverted = !!rowData.convert_to;
                                                const targetType = 'Borrower';
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
                    text="The selected items will be deleted (Demo)."
                />
            </div>
        </div>
    );
}
