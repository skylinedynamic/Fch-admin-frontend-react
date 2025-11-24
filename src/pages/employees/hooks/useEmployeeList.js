import { useState, useEffect } from 'react';
import { FilterMatchMode, FilterOperator } from 'primereact/api';
import { fetchEmployees, fetchDepartmentStatus, deleteEmployees } from '../../../modules/employee';
import { toast } from 'react-toastify';

export function useEmployeeList() {
    // State
    const [filters, setFilters] = useState({});
    const [globalFilterValue, setGlobalFilterValue] = useState('');
    const [selection, setSelection] = useState([]);
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [deptFilter, setDeptFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    const [sortField, setSortField] = useState('id');
    const [sortOrder, setSortOrder] = useState('asc');
    const [totalRecords, setTotalRecords] = useState(0);
    const [appliedFilters, setAppliedFilters] = useState({});
    const [appliedGlobalFilterValue, setAppliedGlobalFilterValue] = useState('');
    const [appliedDeptFilter, setAppliedDeptFilter] = useState('');
    const [appliedStatusFilter, setAppliedStatusFilter] = useState('');
    const [departments, setDepartments] = useState([]);
    const [deleteRows, setDeleteRows] = useState([]);
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    // Initialize filters
    const initFilters = () => {
        const initial = {
            global: { value: null, matchMode: FilterMatchMode.CONTAINS },
            full_name: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }] },
            phone_number: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
            email: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
            department: { operator: FilterOperator.OR, constraints: [{ value: null, matchMode: FilterMatchMode.EQUALS }] },
            designation: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
            address: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
            job_status: { operator: FilterOperator.OR, constraints: [{ value: null, matchMode: FilterMatchMode.EQUALS }] }
        };
        setFilters(initial);
        setAppliedFilters(initial);
        setGlobalFilterValue('');
        setAppliedGlobalFilterValue('');
    };

    // Load departments
    const loadDepartments = async () => {
        try {
            const departmentList = await fetchDepartmentStatus({ type: 'department' });
            setDepartments(departmentList);
        } catch (error) {
            console.error('Failed to load departments', error);
        }
    };

    // Load employees
    const loadEmployees = () => {
        setLoading(true);
        const payload = {
            department: appliedDeptFilter || '',
            job_status: appliedStatusFilter || '',
            search: appliedGlobalFilterValue || '',
            filters: appliedFilters,
            page,
            per_page: perPage,
            sort_field: sortField,
            sort_order: sortOrder,
        };

        fetchEmployees(payload)
            .then((res) => {
                const next = Array.isArray(res) ? res : res?.employees ?? [];
                const meta = Array.isArray(res) ? undefined : res?.meta;
                setRows(next);
                if (meta) {
                    setTotalRecords(typeof meta.total === 'number' ? meta.total : next.length);
                    if (typeof meta.current_page === 'number') setPage(meta.current_page);
                    if (typeof meta.per_page === 'number') setPerPage(meta.per_page);
                } else {
                    setTotalRecords(next.length);
                }
            })
            .catch((err) => {
                console.error('Failed to fetch employees', err);
            })
            .finally(() => setLoading(false));
    };

    // Apply filters
    const onApplyFilters = () => {
        setAppliedGlobalFilterValue(globalFilterValue || '');
        setAppliedDeptFilter(deptFilter || '');
        setAppliedStatusFilter(statusFilter || '');
        setAppliedFilters(filters);
        setPage(1);
    };

    // Clear filters
    const onClearFilters = () => {
        const reset = {
            global: { value: null, matchMode: FilterMatchMode.CONTAINS },
            full_name: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }] },
            phone_number: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
            email: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
            department: { operator: FilterOperator.OR, constraints: [{ value: null, matchMode: FilterMatchMode.EQUALS }] },
            designation: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
            address: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
            job_status: { operator: FilterOperator.OR, constraints: [{ value: null, matchMode: FilterMatchMode.EQUALS }] }
        };

        setGlobalFilterValue('');
        setAppliedGlobalFilterValue('');
        setDeptFilter('');
        setAppliedDeptFilter('');
        setStatusFilter('');
        setAppliedStatusFilter('');
        setFilters(reset);
        setAppliedFilters(reset);
        setPage(1);
    };

    // Delete handlers
    const openDeleteModal = () => {
        if (!selection || selection.length === 0) {
            toast.warn('Please select at least one employee to delete.');
            return;
        }
        setDeleteRows(selection);
        setShowDeleteModal(true);
    };

    const closeDeleteModal = () => {
        setShowDeleteModal(false);
    };

    const handleDeleteConfirm = async () => {
        if (!deleteRows || deleteRows.length === 0) return;

        const ids = deleteRows.map(e => e.id);
        try {
            setLoading(true);
            await deleteEmployees(ids);
            toast.success("Employees deleted successfully");
            setShowDeleteModal(false);
            setSelection([]);
            loadEmployees();
        } catch (err) {
            toast.error('Failed to delete employees. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Initialize on mount
    useEffect(() => {
        initFilters();
        loadDepartments();
    }, []);

    // Fetch employees when filters change
    useEffect(() => {
        if (!appliedFilters || Object.keys(appliedFilters).length === 0) return;
        setLoading(true);
        const timeout = setTimeout(() => {
            loadEmployees();
        }, 300);
        return () => clearTimeout(timeout);
    }, [appliedDeptFilter, appliedStatusFilter, appliedGlobalFilterValue, appliedFilters, page, perPage, sortField, sortOrder]);

    return {
        // State
        filters,
        setFilters,
        globalFilterValue,
        setGlobalFilterValue,
        selection,
        setSelection,
        rows,
        loading,
        deptFilter,
        setDeptFilter,
        statusFilter,
        setStatusFilter,
        page,
        setPage,
        perPage,
        setPerPage,
        sortField,
        setSortField,
        sortOrder,
        setSortOrder,
        totalRecords,
        departments,
        showDeleteModal,
        // Handlers
        onApplyFilters,
        onClearFilters,
        openDeleteModal,
        closeDeleteModal,
        handleDeleteConfirm
    };
}
