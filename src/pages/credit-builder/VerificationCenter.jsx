import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { DataTable } from '../../components/Table/DataTableWrapper';
import { Column } from 'primereact/column';
import { Dropdown } from 'primereact/dropdown';
import { FilterMatchMode, FilterOperator } from 'primereact/api';
import { toast } from 'react-toastify';

import TableLoader from '../../components/Loader/TableLoader';
import { useAuthStore } from '../../store/auth/authStore';
import { fetchVerificationRequests } from '../../modules/verification-center/services';
import { fetchPartners } from '../../modules/partner/services';

export default function VerificationCenter() {
    const { user } = useAuthStore();
    const isDeveloper = user?.role_name === 'Developer';
    const isHost = user?.is_host === 1;

    const [verifications, setVerifications] = useState([]);
    const [loading, setLoading] = useState(true);

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
        tier_name: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
        pending_count: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.EQUALS }] },
        request_date: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] }
    });

    // UI Filter State
    const [searchText, setSearchText] = useState('');
    const [appliedSearchText, setAppliedSearchText] = useState('');
    const [partnersList, setPartnersList] = useState([]);
    const [selectedPartner, setSelectedPartner] = useState('');
    const [appliedPartner, setAppliedPartner] = useState('');


    // Load partners if host
    useEffect(() => {
        if (isHost) {
            const loadPartners = async () => {
                try {
                    const result = await fetchPartners();
                    if (result.status) {
                        const formattedPartners = (result.data || []).map(partner => ({
                            id: partner.id,
                            displayLabel: partner.full_name
                        }));
                        setPartnersList(formattedPartners);
                    }
                } catch (err) {
                    console.error('Failed to load partners:', err);
                }
            };
            loadPartners();
        }
    }, [isHost]);

    const loadVerifications = useCallback(async () => {
        setLoading(true);
        try {
            const payload = {
                page: page,
                per_page: perPage,
                sort_field: sortField,
                sort_order: sortOrder,
                search: appliedSearchText,
                partner_id: appliedPartner,
                filters: filters
            };

            const response = await fetchVerificationRequests(payload);

            if (response.status) {
                setVerifications(response.data || []);
                setTotalRecords(response.meta?.total || 0);
            } else {
                toast.error(response.message || 'Failed to load verifications');
                setVerifications([]);
            }
        } catch (err) {
            console.error('Error loading verifications:', err);
            toast.error('Failed to load verifications');
            setVerifications([]);
        } finally {
            setLoading(false);
        }
    }, [page, perPage, sortField, sortOrder, appliedSearchText, appliedPartner, filters]);

    useEffect(() => {
        loadVerifications();
    }, [loadVerifications]);

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
        setAppliedPartner(selectedPartner);
        setPage(1);
    };

    const handleClearFilters = () => {
        setSearchText('');
        setAppliedSearchText('');
        setSelectedPartner('');
        setAppliedPartner('');
        setFilters({
            borrower_name: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
            partner_name: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
            tier_name: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
            pending_count: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.EQUALS }] },
            request_date: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] }
        });
        setPage(1);
    };

    const borrowerNameTemplate = (rowData) => {
        return (
            <Link to={`/verification-center/borrower-requests/${rowData.borrower_id}`} className="fw-medium text-primary cursor-pointer">
                {rowData.borrower_name}
            </Link>
        );
    };

    const pendingCountTemplate = (rowData) => {
        return (
            <span className={`badge ${rowData.pending_count > 0 ? 'bg-danger-subtle text-danger' : 'bg-success-subtle text-success'} fs-12`}>
                {rowData.pending_count} Pending
            </span>
        );
    };

    const dateBodyTemplate = (rowData) => {
        return (
            <div className="text-muted">
                {rowData.request_date}
            </div>
        );
    };



    return (
        <div className="page-content">
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
                                        <div className={isHost ? "col-xxl-7 col-lg-6" : "col-xxl-9 col-lg-9"}>
                                            <div className="search-box">
                                                <input
                                                    type="text"
                                                    className="form-control search bg-light border-light"
                                                    autoComplete="off"
                                                    placeholder="Search borrower, partner or tier..."
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

                                        {isHost && (
                                            <div className="col-xxl-3 col-lg-3">
                                                <Dropdown
                                                    value={selectedPartner}
                                                    onChange={(e) => setSelectedPartner(e.value)}
                                                    options={[
                                                        { label: 'All Partners', value: '' },
                                                        ...partnersList.map(partner => ({
                                                            label: partner.displayLabel,
                                                            value: partner.id
                                                        }))
                                                    ]}
                                                    optionLabel="label"
                                                    optionValue="value"
                                                    placeholder="All Partners"
                                                    className="w-100 employee-filter-dropdown"
                                                />
                                            </div>
                                        )}


                                        <div className={isHost ? "col-xxl-2 col-lg-3" : "col-xxl-3 col-lg-3"}>
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
                                        rows={10}
                                        columns={[
                                            { style: { width: '25%' } },
                                            { style: { width: '20%' } },
                                            { style: { width: '15%' } },
                                            { style: { width: '15%' } },
                                            { style: { width: '25%' } }
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
                                        className="p-datatable-sm custom-table"
                                        tableStyle={{ minWidth: '60rem' }}
                                        dataKey="id"
                                        responsiveLayout="scroll"
                                    >
                                        <Column
                                            field="borrower_name"
                                            header="Borrower Name"
                                            body={borrowerNameTemplate}
                                            sortable
                                            filter
                                            filterPlaceholder="Search Name"
                                            style={{ width: '25%' }}
                                        />
                                        <Column
                                            field="partner_name"
                                            header="Partner Name"
                                            sortable
                                            filterPlaceholder="Search Partner"
                                            style={{ width: '20%' }}
                                            body={(rowData) => <span className="text-muted fw-medium">{rowData.partner_name}</span>}
                                        />
                                        <Column
                                            field="tier_name"
                                            header="Tier Name"
                                            sortable
                                            filter
                                            filterPlaceholder="Search Tier"
                                            style={{ width: '15%' }}
                                            body={(rowData) => <span className="badge bg-info-subtle text-info fs-11">{rowData.tier_name}</span>}
                                        />
                                        <Column
                                            field="pending_count"
                                            header="Pending Requests"
                                            body={pendingCountTemplate}
                                            sortable
                                            filter
                                            filterPlaceholder="Search Count"
                                            style={{ width: '15%' }}
                                        />
                                        <Column
                                            field="request_date"
                                            header="Request Date"
                                            body={dateBodyTemplate}
                                            sortable
                                            filter
                                            filterPlaceholder="Search Date"
                                            style={{ width: '25%' }}
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
