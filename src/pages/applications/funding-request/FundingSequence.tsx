import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { DataTable } from '../../../components/Table/DataTableWrapper';
import { Column } from 'primereact/column';
import { Dropdown } from 'primereact/dropdown';
import { FilterMatchMode, FilterOperator } from 'primereact/api';
import { useFundingRequests, useUpdateFundingRequestStatus } from '../../../modules/application';
import { usePermissions } from '../../../lib/auth/usePermissions';
import { useAuthStore } from '../../../store/auth/authStore';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { InputTextarea } from 'primereact/inputtextarea';
import { toast } from 'react-toastify';
import TableLoader from '../../../components/Loader/TableLoader';
import { formatCurrency } from '../../../utils/helper';
import { FUNDING_REVIEW_STATUS, FUNDING_REVIEW_STATUS_OPTIONS } from '../../../config/funding';

export default function FundingSequence() {
    const { hasPermission } = usePermissions();
    const currentUser = useAuthStore((state: any) => state.user)
    const isHost = currentUser?.is_host == 1;
    const navigate = useNavigate();

    // Pagination state
    const [page, setPage] = useState<number>(1);
    const [perPage, setPerPage] = useState<number>(10);

    // Sorting state
    const [sortField, setSortField] = useState<string>('id');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

    // Filter states
    const [searchText, setSearchText] = useState<string>('');
    const [selectedStatus, setSelectedStatus] = useState<string>('');
    const [selectedFundingSequenceId, setSelectedFundingSequenceId] = useState<string>('');
    const [filters, setFilters] = useState<any>({});

    // Removed modal state

    // Applied Filters
    const [appliedFilters, setAppliedFilters] = useState<{
        search: string;
        status: string;
        funding_sequence_id: string;
        filters: any;
    }>({
        search: '',
        status: '',
        funding_sequence_id: '',
        filters: {}
    });

    // API Query
    const queryParams = {
        page,
        per_page: perPage,
        search: appliedFilters.search,
        status: appliedFilters.status,
        funding_sequence_id: appliedFilters.funding_sequence_id,
        sort_field: sortField,
        sort_order: sortOrder,
    };


    const { data: apiResponse, isLoading, isFetching } = useFundingRequests(queryParams);
    const reviews = apiResponse?.data || [];
    const totalRecords = apiResponse?.meta?.total || 0;
    const fundingTypes = apiResponse?.funding_types || [];
    const loading = isLoading || isFetching;

    const initFilters = () => {
        const initial = {
            global: { value: null, matchMode: FilterMatchMode.CONTAINS },
            status: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.EQUALS }] },
        };
        setFilters(initial);
        setAppliedFilters(prev => ({ ...prev, filters: initial }));
    };

    useEffect(() => {
        initFilters();
        document.body.classList.add('table-page-fit-active');
        return () => {
            document.body.classList.remove('table-page-fit-active');
        };
    }, []);

    const handleApplyFilters = () => {
        setAppliedFilters(prev => ({
            ...prev,
            search: searchText,
            status: selectedStatus,
            funding_sequence_id: selectedFundingSequenceId,
            filters: filters
        }));
        setPage(1);
    };

    const handleClearFilters = () => {
        setSearchText('');
        setSelectedStatus('');
        setSelectedFundingSequenceId('');
        initFilters();
        setAppliedFilters({
            search: '',
            status: '',
            funding_sequence_id: '',
            filters: {}
        });
        setPage(1);
    };

    const onPage = (event: any) => {
        const nextPerPage = event.rows;
        const nextPage = Math.floor(event.first / event.rows) + 1;
        setPerPage(nextPerPage);
        setPage(nextPage);
    };

    const onSort = (event: any) => {
        const field = event.sortField;
        const order = event.sortOrder === 1 ? 'asc' : 'desc';
        setSortField(field || sortField);
        setSortOrder(order);
    };

    const onFilter = (e: any) => {
        setFilters(e.filters);
        setAppliedFilters(prev => ({
            ...prev,
            filters: e.filters
        }));
        setPage(1);
    };



    const statusClassMap: Record<string, string> = {
        [FUNDING_REVIEW_STATUS.APPROVED]: 'bg-success-subtle text-success',
        [FUNDING_REVIEW_STATUS.ACCEPTED]: 'bg-info-subtle text-info',
        [FUNDING_REVIEW_STATUS.REJECTED]: 'bg-danger-subtle text-danger',
        [FUNDING_REVIEW_STATUS.CANCELED]: 'bg-secondary-subtle text-secondary',
        [FUNDING_REVIEW_STATUS.PENDING]: 'bg-warning-subtle text-warning',
        [FUNDING_REVIEW_STATUS.IN_PROGRESS]: 'bg-primary-subtle text-primary',
    };

    const statusBodyTemplate = (rowData: any) => {
        const className = statusClassMap[rowData.status] || 'bg-secondary-subtle text-secondary';
        return <span className={`badge ${className} text-uppercase`}>{rowData.status}</span>;
    };

    const actionBodyTemplate = (rowData: any) => {
        return (
            <button
                className="btn btn-sm btn-primary d-flex align-items-center justify-content-center px-3 rounded shadow-sm"
                onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/intake-review/funding-request/${rowData.id}`);
                }}
            >
                <i className="ri-eye-line me-1 fs-15 align-middle"></i>
                <span className="fw-medium">Review</span>
            </button>
        );
    };



    return (
        <div className="page-content page-content-fit">
            <div className="container-fluid">
                <div className="row pb-1 mobile-sticky-header">
                    <div className="col-12">
                        <div className="d-flex align-items-center justify-content-between flex-row py-2">
                            <div className="flex-grow-1">
                                <h4 className="fs-20 mb-1">Funding Requests</h4>
                                <nav aria-label="breadcrumb" className="d-block">
                                    <ol className="breadcrumb m-0">
                                        <li className="breadcrumb-item"><Link to="/">Dashboard</Link></li>
                                        <li className="breadcrumb-item active" aria-current="page">Funding Requests</li>
                                    </ol>
                                </nav>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="row row-table-fit funding-sequnce-section">
                    <div className="col-12">
                        <div className="card shadow-sm border-0">
                            <div className="card-body">
                                <form className="table-filter mb-1" onSubmit={(e) => { e.preventDefault(); handleApplyFilters(); }}>
                                    <div className="row g-3 mb-2">
                                        <div className="col-xxl-5 col-sm-12">
                                            <div className="search-box">
                                                <input
                                                    type="text"
                                                    className="form-control search bg-light border-light"
                                                    placeholder="Search borrower or partner name..."
                                                    value={searchText}
                                                    onChange={(e) => setSearchText(e.target.value)}
                                                    onKeyDown={(e) => e.key === 'Enter' && handleApplyFilters()}
                                                />
                                                <i className="ri-search-line search-icon"></i>
                                            </div>
                                        </div>
                                        <div className="col-xxl-2 col-sm-6">
                                            <div>
                                                <Dropdown
                                                    value={selectedStatus}
                                                    options={[{ label: 'All Status', value: '' }, ...FUNDING_REVIEW_STATUS_OPTIONS.map(o => ({ ...o, value: o.value || '' }))]}
                                                    optionLabel="label"
                                                    optionValue="value"
                                                    onChange={(e) => setSelectedStatus(e.value)}
                                                    filter
                                                    filterBy="label"
                                                    placeholder="All Status"
                                                    className="w-100 bg-light border-light"
                                                />
                                            </div>
                                        </div>
                                        <div className="col-xxl-2 col-sm-6">
                                            <div className="h-100">
                                                <Dropdown
                                                    value={selectedFundingSequenceId}
                                                    options={[{ label: 'All Funding Types', value: '' }, ...fundingTypes.map((ft: any) => ({ label: ft.name, value: ft.id }))]}
                                                    optionLabel="label"
                                                    optionValue="value"
                                                    onChange={(e) => setSelectedFundingSequenceId(e.value)}
                                                    filter
                                                    filterBy="label"
                                                    placeholder="All Funding Types"
                                                    className="w-100 bg-light border-light"
                                                />
                                            </div>
                                        </div>
                                        <div className="col-xxl-3 col-sm-12">
                                            <div className="d-flex gap-2">
                                                <button type="button" className="btn btn-warning flex-grow-1 fs-13 d-flex align-items-center justify-content-center gap-2" onClick={handleApplyFilters}>
                                                    <i className="ri-equalizer-fill align-bottom"></i> Filters
                                                </button>
                                                <button type="button" className="btn-clear flex-grow-1 fs-13 d-flex align-items-center justify-content-center gap-2" onClick={handleClearFilters}>
                                                    <i className="ri-close-line align-bottom"></i> Clear
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </form>

                                {loading ? (
                                    <TableLoader rows={10} columns={new Array(8).fill({ style: { minWidth: '100px' } })} />
                                ) : (
                                    <div className="table-responsive table-card mt-1">
                                        <DataTable
                                            scrollable
                                            scrollHeight="flex"
                                            value={reviews}
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
                                            dataKey="id"
                                            responsiveLayout="scroll"
                                            className="p-datatable-sm p-datatable-hoverable-rows"
                                            emptyMessage="No funding requests found"
                                            onRowClick={(e) => navigate(`/intake-review/funding-request/${e.data.id}`)}
                                            rowClassName={() => 'cursor-pointer'}
                                        >
                                            <Column field="borrower_name" header="Borrower Name" body={(r) => `${r.borrower?.first_name || ''} ${r.borrower?.last_name || ''}`} sortable style={{ minWidth: '160px' }} />
                                            {isHost && (
                                                <Column field="partner_name" header="Partner Name" body={(r) => r.partner?.full_name || '-'} sortable style={{ minWidth: '160px' }} />
                                            )}
                                            <Column field="funding_sequence_id" header="Funding Sequence" body={(r) => r.funding_sequence?.name || '-'} sortable style={{ minWidth: '160px' }} />
                                            <Column field="funding_type" header="Funding Type" sortable style={{ minWidth: '150px' }} />
                                            <Column field="use_of_funds" header="Purpose" sortable style={{ minWidth: '160px' }} />
                                            <Column header="Requested Amount" field="requested_amount" body={(r) => formatCurrency(r.requested_amount ?? 0, '$', 1, 0)} sortable style={{ minWidth: '150px' }} />
                                            {isHost && (
                                                <Column field="lender_names" header="Assigned Lender" body={(r) => r.lender_names || '-'} sortable style={{ minWidth: '160px' }} />
                                            )}
                                            <Column field="status" header="Status" body={statusBodyTemplate} sortable style={{ minWidth: '140px' }} />
                                            <Column header="Action" body={actionBodyTemplate} style={{ minWidth: '100px' }} />
                                        </DataTable>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>



            </div>
        </div>
    );
}
