import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { DataTable } from '../../components/Table/DataTableWrapper';
import { Column } from 'primereact/column';
import { toast } from 'react-toastify';
import TableLoader from '../../components/Loader/TableLoader';
import { fetchVendorAccounts, deleteVendorAccount } from '../../modules/vendor-accounts/services';
import { FilterMatchMode, FilterOperator } from 'primereact/api';

export default function VendorAccountsList() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [accounts, setAccounts] = useState([]);
    
    // Pagination state
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    const [totalRecords, setTotalRecords] = useState(0);

    // Sorting state
    const [sortField, setSortField] = useState('id');
    const [sortOrder, setSortOrder] = useState('asc');

    // Filter states
    const [searchText, setSearchText] = useState('');
    const [appliedSearchText, setAppliedSearchText] = useState('');
    const [filters, setFilters] = useState({});
    const [appliedFilters, setAppliedFilters] = useState({});

    // Initialize filters
    const initFilters = () => {
        const initial = {
            card_name: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
            issuer: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
            credit_category: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.EQUALS }] }
        };
        setFilters(initial);
        setAppliedFilters(initial);
    };

    useEffect(() => {
        initFilters();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const payload = {
                page: page,
                per_page: perPage,
                sort_field: sortField,
                sort_order: sortOrder,
                search: appliedSearchText,
                filters: appliedFilters
            };
            const response = await fetchVendorAccounts(payload);
            if (response.status !== false) {
                setAccounts(response.data || []);
                setTotalRecords(response.meta?.total || response.total || 0);
            } else {
                toast.error(response.message || 'Failed to fetch vendor accounts');
            }
        } catch (err) {
            console.error(err);
            toast.error('Failed to fetch vendor accounts');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [page, perPage, sortField, sortOrder, appliedSearchText, appliedFilters]);

    const onPage = (event) => {
        const nextPerPage = event.rows;
        const nextPage = Math.floor(event.first / event.rows) + 1;
        setPerPage(nextPerPage);
        setPage(nextPage);
    };

    const onSort = (event) => {
        setSortField(event.sortField);
        setSortOrder(event.sortOrder === 1 ? 'asc' : 'desc');
        setPage(1);
    };

    const handleApplyFilters = () => {
        setAppliedSearchText(searchText);
        setAppliedFilters(filters);
        setPage(1);
    };

    const handleClearFilters = () => {
        setSearchText('');
        setAppliedSearchText('');
        initFilters();
        setPage(1);
    };

    const imageBodyTemplate = (rowData) => {
        return (
            <div className="d-flex align-items-center">
                {rowData.full_image_url ? (
                    <img src={rowData.full_image_url} alt={rowData.card_name} className="rounded" style={{ width: '40px', height: 'auto', objectFit: 'contain' }} />
                ) : (
                    <div className="bg-light rounded d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px' }}>
                        <i className="ri-image-line text-muted fs-20"></i>
                    </div>
                )}
            </div>
        );
    };

    const nameBodyTemplate = (rowData) => {
        return (
            <Link to={`/vendor-accounts/${rowData.id}`} className="fw-medium link-primary">
                {rowData.card_name}
            </Link>
        );
    };

    const actionBodyTemplate = (rowData) => {
        return (
            <div className="d-flex gap-2 justify-content-end">
                <button className="btn btn-soft-primary btn-sm" onClick={() => navigate(`/vendor-accounts/${rowData.id}`)}>
                    <i className="ri-edit-line"></i>
                </button>
                <button className="btn btn-soft-danger btn-sm" onClick={() => handleDelete(rowData.id)}>
                    <i className="ri-delete-bin-line"></i>
                </button>
            </div>
        );
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this account?')) return;
        try {
            await deleteVendorAccount(id);
            toast.success('Account deleted successfully');
            loadData();
        } catch (err) {
            toast.error('Failed to delete account');
        }
    };

    return (
        <div className="page-content">
            <div className="container-fluid">
                <div className="row pb-1 page-subheader-sticky bg-body">
                    <div className="col-12">
                        <div className="d-flex align-items-center justify-content-between flex-row py-2">
                            <div className="flex-grow-1">
                                <h4 className="fs-20 mb-1">Vendor Accounts</h4>
                                <nav aria-label="breadcrumb">
                                    <ol className="breadcrumb m-0">
                                        <li className="breadcrumb-item"><Link to="/">Dashboard</Link></li>
                                        <li className="breadcrumb-item">Credit Builder</li>
                                        <li className="breadcrumb-item active">Vendor Accounts</li>
                                    </ol>
                                </nav>
                            </div>
                            <div className="mt-0">
                                <Link to="/vendor-accounts/create" className="btn btn-primary fw-medium waves-effect waves-light">
                                    <i className="ri-add-fill me-1 align-bottom"></i> Add Account
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="row">
                    <div className="col-12">
                        <div className="card shadow-none border">
                            <div className="card-body">
                                <div className="row g-3 mb-3">
                                    <div className="col-xxl-9 col-sm-12">
                                        <div className="search-box">
                                            <input
                                                type="text"
                                                className="form-control search bg-light border-light"
                                                placeholder="Search by card name, issuer..."
                                                value={searchText}
                                                onChange={(e) => setSearchText(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && handleApplyFilters()}
                                            />
                                            <i className="ri-search-line search-icon"></i>
                                        </div>
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

                                {loading ? (
                                    <TableLoader rows={10} columns={new Array(7).fill({ style: { minWidth: '120px' } })} />
                                ) : (
                                    <DataTable
                                        value={accounts}
                                        paginator
                                        lazy
                                        rows={perPage}
                                        first={(page - 1) * perPage}
                                        totalRecords={totalRecords}
                                        onPage={onPage}
                                        onSort={onSort}
                                        sortField={sortField}
                                        sortOrder={sortOrder === 'asc' ? 1 : -1}
                                        onFilter={(e) => {
                                            setFilters(e.filters);
                                            setAppliedFilters(e.filters);
                                            setPage(1);
                                        }}
                                        filters={filters}
                                        filterDisplay="menu"
                                        className="p-datatable-sm custom-datatable"
                                        tableStyle={{ minWidth: '80rem' }}
                                        dataKey="id"
                                        responsiveLayout="scroll"
                                    >
                                        <Column header="Image" body={imageBodyTemplate} style={{ width: '80px' }} />
                                        <Column field="card_name" header="Name" body={nameBodyTemplate} sortable filter filterPlaceholder="Search by name" style={{ width: '20%' }} />
                                        <Column field="issuer" header="Issuer" sortable filter filterPlaceholder="Search by issuer" style={{ width: '15%' }} />
                                        <Column field="typical_personal_fico_min" header="FICO Min" sortable style={{ width: '10%' }} />
                                        <Column field="typical_personal_fico_ideal" header="FICO Ideal" sortable style={{ width: '10%' }} />
                                        <Column field="time_in_business_min_months" header="Biz Months" sortable style={{ width: '10%' }} />
                                        <Column header="Action" body={actionBodyTemplate} style={{ width: '120px', textAlign: 'right' }} />
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
