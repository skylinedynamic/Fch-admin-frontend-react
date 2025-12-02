import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { DataTable } from '../../../components/Table/DataTableWrapper';
import { Column } from 'primereact/column';
import { FilterMatchMode, FilterOperator } from 'primereact/api';
import { fetchBorrowers } from '../../../modules/partner/services';
import { toast } from 'react-toastify';

export default function ClientListSection() {
    const { id } = useParams();
    const [borrowers, setBorrowers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    const [totalRecords, setTotalRecords] = useState(0);
    const [sortField, setSortField] = useState('id');
    const [sortOrder, setSortOrder] = useState('desc');
    const [filters, setFilters] = useState({});

    useEffect(() => {
        initFilters();
    }, []);

    const initFilters = () => {
        const initial = {
            global: { value: null, matchMode: FilterMatchMode.CONTAINS },
            full_name: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
            business_name: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
            business_email: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
            business_phone: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
            business_start_date: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] }
        };
        setFilters(initial);
    };

    const loadBorrowers = async () => {
        try {
            setLoading(true);
            const response = await fetchBorrowers({
                partner_id: id,
                page: page,
                per_page: perPage,
                sort_field: sortField,
                sort_order: sortOrder,
                filters: filters  // Add filters to API call
            });

            if (response && response.status) {
                setBorrowers(response.data || []);
                if (response.meta) {
                    setTotalRecords(response.meta.total || 0);
                    setPage(response.meta.current_page || 1);
                    setPerPage(response.meta.per_page || 10);
                }
            } else if (Array.isArray(response)) {
                setBorrowers(response);
                setTotalRecords(response.length);
            }
        } catch (error) {
            console.error('Failed to fetch borrowers', error);
            // toast.error('Failed to load client list');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (id && Object.keys(filters).length > 0) {  // Only load when filters are initialized
            loadBorrowers();
        }
    }, [id, page, perPage, sortField, sortOrder, filters]);  // Add filters to dependencies

    const onPage = (event) => {
        setPerPage(event.rows);
        setPage(Math.floor(event.first / event.rows) + 1);
    };

    const onSort = (event) => {
        setSortField(event.sortField || sortField);
        setSortOrder(event.sortOrder === 1 ? 'asc' : 'desc');
    };

    const onFilter = (e) => {
        setFilters(e.filters);
        setPage(1);
    };

    return (
        <div className="table-responsive table-card mt-1">
            <DataTable
                scrollable
                scrollHeight="510px"
                value={borrowers}
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
                globalFilterFields={[
                    'full_name',
                    'business_name',
                    'business_email',
                    'business_phone',
                    'business_start_date'
                ]}
                dataKey="id"
                responsiveLayout="scroll"
                className="p-datatable-sm"
                loading={loading}
                emptyMessage="No clients found"
            >
                <Column
                    field="full_name"
                    header="Name"
                    sortable
                    filter
                    showFilterMatchModes
                    filterPlaceholder="Search by name"
                    style={{ minWidth: '150px' }}
                />
                <Column
                    field="business_name"
                    header="Company Name"
                    sortable
                    filter
                    showFilterMatchModes
                    filterPlaceholder="Search by company"
                    style={{ minWidth: '200px' }}
                />
                <Column
                    field="business_email"
                    header="Email Address"
                    sortable
                    filter
                    showFilterMatchModes
                    filterPlaceholder="Search by email"
                    style={{ minWidth: '200px' }}
                />
                <Column
                    field="business_phone"
                    header="Phone Number"
                    sortable
                    filter
                    showFilterMatchModes
                    filterPlaceholder="Search by phone"
                    style={{ minWidth: '150px' }}
                />
                <Column
                    field="business_start_date"
                    header="Joining Date"
                    sortable
                    filter
                    showFilterMatchModes
                    filterPlaceholder="Search by date"
                    style={{ minWidth: '150px' }}
                />
            </DataTable>
        </div>
    );
}
