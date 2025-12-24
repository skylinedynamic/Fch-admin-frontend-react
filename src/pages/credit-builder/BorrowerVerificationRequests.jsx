import React, { useEffect, useState, useCallback } from 'react';
import { Link, useParams, useLocation, useNavigate } from 'react-router-dom';
import { DataTable } from '../../components/Table/DataTableWrapper';
import { Column } from 'primereact/column';
import { Dropdown } from 'primereact/dropdown';
import { FilterMatchMode, FilterOperator } from 'primereact/api';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import TableLoader from '../../components/Loader/TableLoader';
import { fetchBorrowerVerificationRequests } from '../../modules/verification-center/services';

export default function BorrowerVerificationRequests() {
    const location = useLocation();
    const navigate = useNavigate();
    const { borrower_id, partner_id, borrower_name, partner_name } = location.state || {};

    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [borrowerName, setBorrowerName] = useState(borrower_name || '');
    const [partnerName, setPartnerName] = useState(partner_name || '');

    // Pagination & Sort
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    const [totalRecords, setTotalRecords] = useState(0);
    const [sortField, setSortField] = useState('request_date');
    const [sortOrder, setSortOrder] = useState('desc');

    // Column Filters
    const [filters, setFilters] = useState({
        borrower_name: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
        partner_name: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
        task_title: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
        tier_name: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
        request_date: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] }
    });

    // Filters
    const [searchText, setSearchText] = useState('');
    const [appliedSearchText, setAppliedSearchText] = useState('');


    const loadRequests = useCallback(async () => {
        if (!borrower_id || !partner_id) {
            toast.error('Missing borrower or partner information');
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const payload = {
                borrower_id,
                partner_id,
                page: page,
                per_page: perPage,
                sort_field: sortField,
                sort_order: sortOrder,
                search: appliedSearchText,
                filters: filters
            };

            const response = await fetchBorrowerVerificationRequests(payload);

            if (response.status) {
                setRequests(response.data || []);
                setTotalRecords(response.meta?.total || 0);
                if (response.data?.length > 0) {
                    setBorrowerName(response.data[0].borrower_name);
                }
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
    }, [borrower_id, partner_id, page, perPage, sortField, sortOrder, appliedSearchText, filters]);

    useEffect(() => {
        loadRequests();
    }, [loadRequests]);

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
        setPage(1);
    };

    const handleClearFilters = () => {
        setSearchText('');
        setAppliedSearchText('');
        setFilters({
            borrower_name: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
            partner_name: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
            task_title: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
            tier_name: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
            request_date: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] }
        });
        setPage(1);
    };

    const statusTemplate = (rowData) => {
        let badgeClass = 'bg-info-subtle text-info';
        if (rowData.status === 'pending') badgeClass = 'bg-warning-subtle text-warning';
        if (rowData.status === 'verified' || rowData.status === 'approved') badgeClass = 'bg-success-subtle text-success';
        if (rowData.status === 'rejected') badgeClass = 'bg-danger-subtle text-danger';

        return (
            <span className={`badge ${badgeClass} fs-12 text-capitalize`}>
                {rowData.status}
            </span>
        );
    };

    const taskTitleTemplate = (rowData) => {
        return (
            <div className="fw-medium">
                {rowData.task_title}
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
                                <h4 className="fs-20 mb-1">Borrower request task details</h4>
                                <nav aria-label="breadcrumb">
                                    <ol className="breadcrumb m-0">
                                        <li className="breadcrumb-item"><Link to="/">Dashboard</Link></li>
                                        <li className="breadcrumb-item"><Link to="/verification-center">Verification Center</Link></li>
                                        <li className="breadcrumb-item active">Borrower request task details</li>
                                    </ol>
                                </nav>
                            </div>
                            <div className="flex-shrink-0">
                                <button
                                    onClick={() => navigate('/verification-center')}
                                    className="btn btn-outline-primary btn-md px-4"
                                    style={{ borderRadius: '5px' }}
                                >
                                    <i className="ri-arrow-left-line align-bottom me-1"></i> Back
                                </button>
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
                                        <div className="col-xxl-9 col-lg-8">
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

                                {loading ? (
                                    <TableLoader
                                        rows={8}
                                        columns={[
                                            { style: { width: '15%' } },
                                            { style: { width: '15%' } },
                                            { style: { width: '25%' } },
                                            { style: { width: '10%' } },
                                            { style: { width: '15%' } },
                                            { style: { width: '20%' } }
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
                                        tableStyle={{ minWidth: '70rem' }}
                                        dataKey="id"
                                        responsiveLayout="scroll"
                                    >
                                        <Column
                                            field="borrower_name"
                                            header="Borrower Name"
                                            body={(rowData) => <span className="fw-medium text-primary">{rowData.borrower_name || borrowerName}</span>}
                                            sortable
                                            filter
                                            filterPlaceholder="Search Borrower"
                                            style={{ width: '15%' }}
                                        />
                                        <Column
                                            field="partner_name"
                                            header="Partner Name"
                                            body={(rowData) => <span className="text-muted fw-medium">{rowData.partner_name || partnerName}</span>}
                                            sortable
                                            filter
                                            filterPlaceholder="Search Partner"
                                            style={{ width: '15%' }}
                                        />
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
                                            filterPlaceholder="Search Tier"
                                            style={{ width: '10%' }}
                                            body={(rowData) => <span className="badge bg-info-subtle text-info fs-11">{rowData.tier_name}</span>}
                                        />
                                        <Column
                                            field="status"
                                            header="Status"
                                            body={statusTemplate}
                                            sortable
                                            style={{ width: '15%' }}
                                        />
                                        <Column
                                            field="request_date"
                                            header="Request Date"
                                            sortable
                                            filter
                                            filterPlaceholder="Search Date"
                                            style={{ width: '20%' }}
                                            body={(rowData) => <span className="text-muted">{rowData.request_date}</span>}
                                        />
                                    </DataTable>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
