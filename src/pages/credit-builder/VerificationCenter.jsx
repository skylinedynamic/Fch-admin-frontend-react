import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { DataTable } from '../../components/Table/DataTableWrapper';
import { Column } from 'primereact/column';
import { FilterMatchMode, FilterOperator } from 'primereact/api';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import TableLoader from '../../components/Loader/TableLoader';
import { useAuthStore } from '../../store/auth/authStore';

// Dummy data generator
const generateDummyData = (count = 50) => {
    const statuses = ['Pending', 'Verified', 'Rejected', 'In Review'];
    const types = ['Identity', 'Address', 'Income', 'Employment', 'Credit Report'];
    const names = ['John Doe', 'Jane Smith', 'Robert Johnson', 'Emily Davis', 'Michael Brown', 'Sarah Wilson', 'David Martinez', 'Lisa Anderson'];

    return Array.from({ length: count }, (_, i) => ({
        id: i + 1,
        client_name: names[Math.floor(Math.random() * names.length)],
        verification_type: types[Math.floor(Math.random() * types.length)],
        status: statuses[Math.floor(Math.random() * statuses.length)],
        submitted_date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        verified_by: Math.random() > 0.5 ? 'Admin User' : null,
        notes: Math.random() > 0.7 ? 'Additional verification required' : ''
    }));
};

export default function VerificationCenter() {
    const { user } = useAuthStore();
    const isDeveloper = user?.role_name === 'Developer';

    const [verifications, setVerifications] = useState([]);
    const [loading, setLoading] = useState(true);

    // Pagination & Sort
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    const [totalRecords, setTotalRecords] = useState(0);
    const [sortField, setSortField] = useState('submitted_date');
    const [sortOrder, setSortOrder] = useState('desc');

    // PrimeReact DataTable Filters
    const [filters, setFilters] = useState({
        client_name: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
        verification_type: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
        status: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] }
    });

    // UI Filter State
    const [searchText, setSearchText] = useState('');
    const [appliedSearchText, setAppliedSearchText] = useState('');
    const [statusFilter, setStatusFilter] = useState('');

    // Selection
    const [selectedVerifications, setSelectedVerifications] = useState([]);

    const loadVerifications = async () => {
        setLoading(true);
        try {
            // Simulate API call with dummy data
            await new Promise(resolve => setTimeout(resolve, 500));

            let data = generateDummyData(50);

            // Apply search filter
            if (appliedSearchText) {
                data = data.filter(item =>
                    item.client_name.toLowerCase().includes(appliedSearchText.toLowerCase()) ||
                    item.verification_type.toLowerCase().includes(appliedSearchText.toLowerCase())
                );
            }

            // Apply status filter
            if (statusFilter) {
                data = data.filter(item => item.status === statusFilter);
            }

            // Apply sorting
            data.sort((a, b) => {
                const aVal = a[sortField];
                const bVal = b[sortField];
                const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
                return sortOrder === 'asc' ? comparison : -comparison;
            });

            setTotalRecords(data.length);

            // Apply pagination
            const start = (page - 1) * perPage;
            const paginatedData = data.slice(start, start + perPage);

            setVerifications(paginatedData);
        } catch (err) {
            toast.error('Failed to load verifications');
            setVerifications([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadVerifications();
    }, [page, perPage, sortField, sortOrder, appliedSearchText, statusFilter]);

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
        setStatusFilter('');
        setPage(1);
        setFilters({
            client_name: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
            verification_type: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
            status: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] }
        });
    };

    const statusBodyTemplate = (rowData) => {
        const statusColors = {
            'Pending': 'warning',
            'Verified': 'success',
            'Rejected': 'danger',
            'In Review': 'info'
        };
        const color = statusColors[rowData.status] || 'secondary';
        return <span className={`badge bg-${color}`}>{rowData.status}</span>;
    };

    const clientNameBodyTemplate = (rowData) => {
        return (
            <div className="fw-medium text-primary" style={{ cursor: 'pointer' }}>
                {rowData.client_name}
            </div>
        );
    };

    const dateBodyTemplate = (rowData) => {
        return new Date(rowData.submitted_date).toLocaleDateString();
    };

    return (
        <div className="page-content">
            <ToastContainer position="top-right" autoClose={3000} />
            <div className="container-fluid">
                <div className="row mb-3 pb-1 page-subheader-sticky bg-body">
                    <div className="col-12">
                        <div className="d-flex align-items-center justify-content-between flex-row">
                            <div className="flex-grow-1">
                                <h4 className="fs-20 mb-1">Verification Center</h4>
                                <nav aria-label="breadcrumb">
                                    <ol className="breadcrumb m-0">
                                        <li className="breadcrumb-item"><Link to="/">Dashboard</Link></li>
                                        <li className="breadcrumb-item">Credit Builder</li>
                                        <li className="breadcrumb-item active">Verification Center</li>
                                    </ol>
                                </nav>
                            </div>
                            <div className="mt-0">
                                <form onSubmit={(e) => e.preventDefault()}>
                                    <div className="row g-3 mb-0 align-items-center">
                                        <div className="col-sm-auto">
                                            {selectedVerifications.length > 0 && (
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
                                                                className="dropdown-item text-success"
                                                                onClick={() => toast.success('Verifications approved')}
                                                            >
                                                                <i className="ri-check-line me-1 align-bottom"></i> Approve Selected
                                                            </button>
                                                        </li>
                                                        <li>
                                                            <button
                                                                type="button"
                                                                className="dropdown-item text-danger"
                                                                onClick={() => toast.error('Verifications rejected')}
                                                            >
                                                                <i className="ri-close-line me-1 align-bottom"></i> Reject Selected
                                                            </button>
                                                        </li>
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="row">
                    <div className="col-12">
                        <div className="card">
                            <div className="card-body">
                                <form onSubmit={(e) => {
                                    e.preventDefault();
                                    handleApplyFilters();
                                }}>
                                    <div className="row g-3 mb-3">
                                        <div className="col-xxl-5 col-sm-6">
                                            <div className="search-box">
                                                <input
                                                    type="text"
                                                    className="form-control search bg-light border-light"
                                                    autoComplete="off"
                                                    placeholder="Search by client name or type..."
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
                                            <select
                                                className="form-select"
                                                value={statusFilter}
                                                onChange={(e) => setStatusFilter(e.target.value)}
                                            >
                                                <option value="">All Statuses</option>
                                                <option value="Pending">Pending</option>
                                                <option value="Verified">Verified</option>
                                                <option value="Rejected">Rejected</option>
                                                <option value="In Review">In Review</option>
                                            </select>
                                        </div>

                                        <div className="col-xxl-4 col-sm-2">
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
                                    <TableLoader
                                        rows={5}
                                        columns={[
                                            { style: { width: '3rem' } },
                                            { style: { width: '20%' } },
                                            { style: { width: '20%' } },
                                            { style: { width: '15%' } },
                                            { style: { width: '15%' } },
                                            { style: { width: '15%' } },
                                            { style: { width: '15%' } }
                                        ]}
                                    />
                                ) : (
                                    <DataTable
                                        value={verifications || []}
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
                                        className="p-datatable-sm"
                                        tableStyle={{ minWidth: '50rem' }}
                                        selection={selectedVerifications}
                                        onSelectionChange={(e) => setSelectedVerifications(e.value)}
                                        selectionMode="multiple"
                                        dataKey="id"
                                    >
                                        <Column selectionMode="multiple" headerStyle={{ width: '3rem' }} exportable={false} />
                                        <Column field="client_name" header="Client Name" body={clientNameBodyTemplate} sortable filter filterPlaceholder="Search Name" style={{ width: '20%' }} />
                                        <Column field="verification_type" header="Type" sortable filter filterPlaceholder="Search Type" style={{ width: '20%' }} />
                                        <Column field="status" header="Status" body={statusBodyTemplate} sortable filter filterPlaceholder="Search Status" style={{ width: '15%' }} />
                                        <Column field="submitted_date" header="Submitted Date" body={dateBodyTemplate} sortable style={{ width: '15%' }} />
                                        <Column field="verified_by" header="Verified By" sortable style={{ width: '15%' }} />
                                        <Column field="notes" header="Notes" style={{ width: '15%' }} className="text-truncate" />
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
