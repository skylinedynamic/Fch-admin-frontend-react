import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { DataTable } from '../../../components/Table/DataTableWrapper';
import { Column } from 'primereact/column';
import TableLoader from '../../../components/Loader/TableLoader';
import { useCreditProfileRequests } from '../../../modules/credit-profile-request';
import type { CreditProfileRequest } from '../../../modules/credit-profile-request';

export default function CreditProfileRequests() {
    const navigate = useNavigate();

    // Pagination state
    const [page, setPage] = useState<number>(1);
    const [perPage, setPerPage] = useState<number>(10);

    // Search filter state
    const [searchText, setSearchText] = useState<string>('');
    const [appliedSearch, setAppliedSearch] = useState<string>('');

    // Sorting state
    const [sortField, setSortField] = useState<string>('id');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

    useEffect(() => {
        // Add class to body to prevent global scroll
        document.body.classList.add('table-page-fit-active');

        return () => {
            document.body.classList.remove('table-page-fit-active');
        };
    }, []);

    // API Query params
    const queryParams = {
        page,
        per_page: perPage,
        search: appliedSearch || undefined,
        sort_field: sortField,
        sort_order: sortOrder,
    };

    const { data: apiResponse, isLoading, isFetching } = useCreditProfileRequests(queryParams);

    const records = apiResponse?.data?.data || [];
    const totalRecords = apiResponse?.data?.total || 0;
    const loading = isLoading || isFetching;

    const handleApplyFilters = () => {
        setAppliedSearch(searchText);
        setPage(1);
    };

    const handleClearFilters = () => {
        setSearchText('');
        setAppliedSearch('');
        setPage(1);
    };

    // Pagination handler
    const onPage = (event: any) => {
        setPerPage(event.rows);
        setPage(Math.floor(event.first / event.rows) + 1);
    };

    // Sort handler
    const onSort = (event: any) => {
        const field = event.sortField;
        const order = event.sortOrder === 1 ? 'asc' : 'desc';
        setSortField(field || sortField);
        setSortOrder(order);
    };

    // Template bodies
    const borrowerBodyTemplate = (rowData: CreditProfileRequest) => {
        const borrower = rowData.borrower;
        if (!borrower) return <span className="text-muted">—</span>;
        const name = borrower.business_name || `${borrower.first_name || ''} ${borrower.last_name || ''}`.trim() || `Borrower #${borrower.id}`;
        return (
            <div>
                <div className="fw-medium text-dark">{name}</div>
                {borrower.business_name && (borrower.first_name || borrower.last_name) && (
                    <small className="text-muted d-block">
                        {`${borrower.first_name || ''} ${borrower.last_name || ''}`.trim()}
                    </small>
                )}
            </div>
        );
    };

    const applicantNameBodyTemplate = (rowData: CreditProfileRequest) => {
        const middle = rowData.middle_name ? ` ${rowData.middle_name}` : '';
        return <span className="fw-medium">{`${rowData.first_name}${middle} ${rowData.last_name}`}</span>;
    };

    const ssnBodyTemplate = (rowData: CreditProfileRequest) => {
        if (!rowData.ssn) return <span className="text-muted">—</span>;
        const cleaned = rowData.ssn.replace(/\D/g, '');
        const last4 = cleaned.length >= 4 ? cleaned.slice(-4) : cleaned;
        return <span>***-**-{last4}</span>;
    };

    const dateBodyTemplate = (rowData: CreditProfileRequest) => {
        if (!rowData.created_at) return <span className="text-muted">—</span>;
        const date = new Date(rowData.created_at);
        return (
            <span className="text-muted">
                {date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
            </span>
        );
    };

    const actionBodyTemplate = (rowData: CreditProfileRequest) => {
        return (
            <div className="d-flex align-items-center gap-2">
                <Link
                    to={`/intake-review/credit-profile-requests/${rowData.id}`}
                    className="btn btn-sm btn-light-primary btn-icon waves-effect waves-light"
                    title="View Details"
                >
                    <i className="ri-eye-line align-middle"></i>
                </Link>
            </div>
        );
    };

    return (
        <div className="page-content page-content-fit">
            <div className="container-fluid">
                {/* Header Section */}
                <div className="row pb-1 mobile-sticky-header">
                    <div className="col-12">
                        <div className="d-flex align-items-center justify-content-between flex-row py-2">
                            <div className="flex-grow-1">
                                <h4 className="fs-20 mb-1">Request Credit Profile</h4>
                                <nav aria-label="breadcrumb" className="d-block">
                                    <ol className="breadcrumb m-0">
                                        <li className="breadcrumb-item"><Link to="/">Dashboard</Link></li>
                                        <li className="breadcrumb-item">Intake &amp; Review</li>
                                        <li className="breadcrumb-item active" aria-current="page">Request Credit Profile</li>
                                    </ol>
                                </nav>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Filters and Table */}
                <div className="row row-table-fit">
                    <div className="col-lg-12">
                        <div className="card shadow-sm">
                            <div className="card-body">
                                <form className="table-filter" onSubmit={(e) => {
                                    e.preventDefault();
                                    handleApplyFilters();
                                }}>
                                    <div className="row g-3 mb-3">
                                        <div className="col-xxl-9 col-sm-8">
                                            <div className="search-box">
                                                <input
                                                    type="text"
                                                    className="form-control search bg-light border-light"
                                                    placeholder="Search applicant name, email, phone, or business name..."
                                                    value={searchText}
                                                    onChange={(e) => setSearchText(e.target.value)}
                                                    onKeyDown={(e) => e.key === 'Enter' && handleApplyFilters()}
                                                />
                                                <i className="ri-search-line search-icon"></i>
                                            </div>
                                        </div>
                                        <div className="col-xxl-3 col-sm-4">
                                            <div className="d-flex gap-2">
                                                <button type="submit" className="btn btn-warning flex-grow-1">
                                                    <i className="ri-equalizer-fill me-1 align-bottom"></i> Filter
                                                </button>
                                                <button type="button" className="btn btn-light flex-grow-1" onClick={handleClearFilters}>
                                                    <i className="ri-close-line me-1 align-bottom"></i> Clear
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </form>

                                {loading ? (
                                    <TableLoader rows={10} columns={new Array(7).fill({ style: { minWidth: '100px' } })} />
                                ) : (
                                    <div className="table-responsive table-card mt-1">
                                        <DataTable
                                            scrollable
                                            scrollHeight="flex"
                                            value={records}
                                            paginator
                                            lazy
                                            totalRecords={totalRecords}
                                            first={(page - 1) * perPage}
                                            rows={perPage}
                                            rowsPerPageOptions={[10, 25, 50, 100]}
                                            sortMode="single"
                                            sortField={sortField}
                                            sortOrder={sortOrder === 'asc' ? 1 : -1}
                                            onPage={onPage}
                                            onSort={onSort}
                                            dataKey="id"
                                            rowClassName={() => 'cursor-pointer'}
                                            onRowClick={(e: any) => {
                                                navigate(`/intake-review/credit-profile-requests/${e.data.id}`);
                                            }}
                                            responsiveLayout="scroll"
                                            className="p-datatable-sm"
                                            emptyMessage="No credit profile requests found."
                                        >
                                            <Column header="Borrower" field="borrower.business_name" body={borrowerBodyTemplate} style={{ minWidth: '180px' }} />
                                            <Column header="Applicant" field="first_name" body={applicantNameBodyTemplate} sortable style={{ minWidth: '180px' }} />
                                            <Column header="Email" field="email" sortable style={{ minWidth: '180px' }} />
                                            <Column header="Phone" field="phone" sortable style={{ minWidth: '140px' }} />
                                            <Column header="SSN" field="ssn" body={ssnBodyTemplate} style={{ minWidth: '120px' }} />
                                            <Column header="Request Date" field="created_at" body={dateBodyTemplate} sortable style={{ minWidth: '130px' }} />
                                            <Column header="Action" body={actionBodyTemplate} style={{ minWidth: '80px', textAlign: 'center' }} />
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
