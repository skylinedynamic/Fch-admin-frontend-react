import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { DataTable } from '../../components/Table/DataTableWrapper'
import { Column } from 'primereact/column'
import { Dropdown } from 'primereact/dropdown'
import { FilterMatchMode, FilterOperator } from 'primereact/api'
import { fetchEmployees, fetchDepartmentStatus, deleteEmployees } from '../../modules/employee'
import DeleteConfirmationModal from '../../components/Common/Modals/DeleteConfirmationModal.jsx'
import { ToastContainer, toast } from "react-toastify";

export default function Employees() {

  // PrimeReact DataTable filters and selection
  const [filters, setFilters] = useState({})
  const [globalFilterValue, setGlobalFilterValue] = useState('')
  const [selection, setSelection] = useState([])
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [deptFilter, setDeptFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(10)
  const [sortField, setSortField] = useState('id')
  const [sortOrder, setSortOrder] = useState('asc')
  const [totalRecords, setTotalRecords] = useState(0)
  // Applied filters state (only changes when user clicks Filters)
  const [appliedFilters, setAppliedFilters] = useState({})
  const [appliedGlobalFilterValue, setAppliedGlobalFilterValue] = useState('')
  const [appliedDeptFilter, setAppliedDeptFilter] = useState('')
  const [appliedStatusFilter, setAppliedStatusFilter] = useState('')
  const [departments, setDepartments] = useState([]);
  const [deleteRows, setDeleteRows] = useState([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Status options for filtering
  const statusOptions = [
    { label: 'Active', value: 'Active' },
    { label: 'Inactive', value: 'Inactive' }
  ]




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
    }
    setFilters(initial)
    setAppliedFilters(initial)
    setGlobalFilterValue('')
    setAppliedGlobalFilterValue('')
  }

  useEffect(() => {
    initFilters()
    loadDepartments();
  }, [])

  const loadDepartments = async () => {
    try {
      const departmentList = await fetchDepartmentStatus({ type: 'department' })
      setDepartments(departmentList)
    } catch (error) {
      console.error('Failed to load departments', error)
    }
  }
  const onGlobalFilterChange = (e) => {
    const value = e.target.value
    let _filters = { ...filters }
    _filters['global'].value = value
    setFilters(_filters)
    setGlobalFilterValue(value)
  }

  const nameBody = (rowData) => (
    <Link to={`/employee-details/${rowData.id}`} className="fw-medium link-primary"> {rowData.full_name}</Link>
  )

  // Status column body template
  const statusBodyTemplate = (rowData) => {
    const value = rowData?.job_status || rowData?.status || ''
    return value ? (<span>{value}</span>) : (<span className="text-muted">—</span>)
  }

  // Status filter dropdown (used in column filter menu)
  const statusRowFilterTemplate = (options) => {
    return (
      <Dropdown
        value={options.value}
        options={statusOptions}
        onChange={(e) => options.filterCallback(e.value)}
        placeholder="Select status"
        className="p-column-filter"
        showClear
      />
    )
  }

  const onJobStatusChange = (e) => {
    const val = e.target.value
    setStatusFilter(val === 'Select Employee Status' ? '' : val)
  }

  const onDeptChange = (e) => {
    const val = e.target.value
    setDeptFilter(val === 'all' || val === 'Select Department' ? '' : val)
  }

  const onApplyFilters = () => {
    setAppliedGlobalFilterValue(globalFilterValue || '')
    setAppliedDeptFilter(deptFilter || '')
    setAppliedStatusFilter(statusFilter || '')
    setAppliedFilters(filters)
    setPage(1)
  }

  const onClearFilters = () => {
    // Clear global and column filters, but preserve department and job_status selections
    const preservedDept = filters?.department
    const preservedJobStatus = filters?.job_status

    const reset = {
      global: { value: null, matchMode: FilterMatchMode.CONTAINS },
      full_name: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }] },
      phone_number: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
      email: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
      department: preservedDept ?? { operator: FilterOperator.OR, constraints: [{ value: null, matchMode: FilterMatchMode.EQUALS }] },
      designation: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
      address: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
      job_status: preservedJobStatus ?? { operator: FilterOperator.OR, constraints: [{ value: null, matchMode: FilterMatchMode.EQUALS }] }
    }

    setGlobalFilterValue('')
    setAppliedGlobalFilterValue('')
    setFilters(reset)
    setAppliedFilters(reset)
    // Do NOT change department/status selections or their applied values
    setPage(1)
  }

  useEffect(() => {
    // Only fetch when filters are applied (via button) or table interactions
    if (!appliedFilters || Object.keys(appliedFilters).length === 0) return
    setLoading(true) // show skeleton before API call
    const timeout = setTimeout(() => {
      const payload = {
        department: appliedDeptFilter || '',
        job_status: appliedStatusFilter || '',
        search: appliedGlobalFilterValue || '',
        filters: appliedFilters,
        page,
        per_page: perPage,
        sort_field: sortField,
        sort_order: sortOrder,
      }
      fetchEmployees(payload)
        .then((res) => {
          const next = Array.isArray(res) ? res : (res?.employees ?? [])
          const meta = Array.isArray(res) ? undefined : res?.meta
          setRows(next)
          if (meta) {
            setTotalRecords(typeof meta.total === 'number' ? meta.total : next.length)
            if (typeof meta.current_page === 'number') setPage(meta.current_page)
            if (typeof meta.per_page === 'number') setPerPage(meta.per_page)
          } else {
            setTotalRecords(next.length)
          }
        })
        .catch((_err) => {

        })
        .finally(() => setLoading(false))
    }, 300)
    return () => clearTimeout(timeout)
  }, [appliedDeptFilter, appliedStatusFilter, appliedGlobalFilterValue, appliedFilters, page, perPage, sortField, sortOrder])

  const onPage = (event) => {
    const nextPerPage = event.rows
    const nextPage = Math.floor(event.first / event.rows) + 1
    setPerPage(nextPerPage)
    setPage(nextPage)
  }

  const onSort = (event) => {
    const field = event.sortField
    const order = event.sortOrder === 1 ? 'asc' : 'desc'
    setSortField(field || sortField)
    setSortOrder(order)
  }
  useEffect(() => {
    const tbody = document.getElementById('employees-list-data')
    if (tbody) {
      Array.prototype.forEach.call(tbody.querySelectorAll('tr'), (tr) => {
        tr.classList.add('cursor-pointer')
      })
      const onTbodyClick = (e) => {
        const target = e.target
        if (target.closest('a, button, input, label, [data-bs-toggle], .remove-item-btn')) return
        const row = target.closest('tr')
        if (!row) return
      }
      tbody.addEventListener('click', onTbodyClick)

      // Cleanup
      return () => {
        tbody.removeEventListener('click', onTbodyClick)
      }
    }
  }, [])


  useEffect(() => {
    // Initialize Choices.js for selects when available (matches template behavior)
    const selects = document.querySelectorAll('[data-choices]')
    selects.forEach((el) => {
      try {
        if (window.Choices && typeof window.Choices === 'function') {
          // Avoid double-initialization
          if (!el._choicesInstance) {
            const instance = new window.Choices(el, { searchEnabled: false })
            el._choicesInstance = instance
          }
        }
      } catch (err) {
        // no-op; plugin load is handled by global assets/js/plugins.js when data-choices exists
      }
    })
  }, [])

  useEffect(() => {
    // Select All checkbox behavior and actions dropdown
    const headerCheck = document.getElementById('checkAll')
    let tbody = document.getElementById('employees-list-data') || document.querySelector('.form-check-all')
    let rowChecks = (tbody
      ? tbody.querySelectorAll('input.form-check-input[name="chk_child"]')
      : document.querySelectorAll('.form-check-all input.form-check-input[name="chk_child"]'))
    const primaryBtn = document.getElementById('primaryActionBtn')
    const originalHref = primaryBtn ? primaryBtn.getAttribute('href') : null
    const toggleBtn = document.getElementById('primaryActionToggleBtn')
    const actionMenu = document.getElementById('primaryActionMenu')

    // Prevent anchor navigation when actions are active
    const preventPrimaryNavigate = (e) => {
      e.preventDefault()
    }

    const syncHeaderState = () => {
      if (!tbody || !headerCheck) return
      const total = rowChecks.length
      const checked = (tbody
        ? tbody.querySelectorAll('input.form-check-input[name="chk_child"]:checked').length
        : document.querySelectorAll('.form-check-all input.form-check-input[name="chk_child"]:checked').length)
      headerCheck.checked = checked === total && total > 0
      headerCheck.indeterminate = checked > 0 && checked < total
    }

    const updatePrimaryBtnLabel = () => {
      if (!primaryBtn) return
      const selected = (tbody
        ? tbody.querySelectorAll('input.form-check-input[name="chk_child"]:checked').length
        : document.querySelectorAll('.form-check-all input.form-check-input[name="chk_child"]:checked').length)
      if (selected > 0) {
        primaryBtn.innerHTML = ' Actions'
        primaryBtn.classList.remove('btn-primary')
        primaryBtn.classList.add('bg-success', 'text-white', 'fw-medium')
        // Prevent navigation when actions are active
        if (preventPrimaryNavigate) {
          primaryBtn.addEventListener('click', preventPrimaryNavigate)
        }
        if (toggleBtn) {
          toggleBtn.classList.remove('d-none', 'btn-primary')
          toggleBtn.classList.add('bg-success', 'text-white', 'fw-medium')
        }
        if (actionMenu) actionMenu.classList.remove('d-none')
      } else {
        primaryBtn.innerHTML = '<i class="ri-add-fill me-1 align-bottom"></i> Add Employee'
        primaryBtn.classList.remove('bg-success', 'text-white')
        primaryBtn.classList.add('btn-primary')
        // Restore default navigation when no selection
        if (preventPrimaryNavigate) {
          primaryBtn.removeEventListener('click', preventPrimaryNavigate)
        }
        if (toggleBtn) {
          toggleBtn.classList.add('d-none')
          toggleBtn.setAttribute('aria-expanded', 'false')
          toggleBtn.classList.remove('bg-success', 'text-white', 'fw-medium')
          toggleBtn.classList.add('btn-primary')
        }
        if (actionMenu) actionMenu.classList.add('d-none')
      }
    }

    const onHeaderChange = () => {
      const on = headerCheck.checked
      rowChecks.forEach((cb) => { cb.checked = on })
      syncHeaderState()
      updatePrimaryBtnLabel()
    }
    const onRowChange = () => {
      syncHeaderState()
      updatePrimaryBtnLabel()
    }

    if (headerCheck) headerCheck.addEventListener('change', onHeaderChange)
    rowChecks.forEach((cb) => cb.addEventListener('change', onRowChange))
    syncHeaderState()
    updatePrimaryBtnLabel()
    const deleteSelectedBtn = document.getElementById('deleteSelected')

    deleteSelectedBtn && deleteSelectedBtn.addEventListener('click', onDeleteSelected)

    // Sticky subheader
    const sticky = document.querySelector('.page-subheader-sticky')
    let observer
    if (sticky) {
      let topOffset = parseInt(getComputedStyle(sticky).top, 10)
      if (isNaN(topOffset)) topOffset = 70
      const sentinel = document.createElement('div')
      sentinel.className = 'sticky-sentinel'
      sentinel.setAttribute('aria-hidden', 'true')
      sentinel.style.position = 'relative'
      sentinel.style.height = '1px'
      sticky.parentNode && sticky.parentNode.insertBefore(sentinel, sticky)
      observer = new IntersectionObserver((entries) => {
        const e = entries[0]
        if (e.isIntersecting) sticky.classList.remove('is-stuck')
        else sticky.classList.add('is-stuck')
      }, { rootMargin: '-' + topOffset + 'px 0px 0px 0px', threshold: [0, 1] })
      observer.observe(sentinel)
    }

    // Cleanup
    return () => {
      if (headerCheck) headerCheck.removeEventListener('change', onHeaderChange)
      rowChecks.forEach((cb) => cb.removeEventListener('change', onRowChange))
      deleteSelectedBtn && deleteSelectedBtn.removeEventListener('click', onDeleteSelected)
      observer && observer.disconnect()
    }
  }, [])


  const handleDeleteConfirm = async () => {
    if (!deleteRows || deleteRows.length === 0) return;

    const ids = deleteRows.map(e => e.id);
    try {
      setLoading(true);
      await deleteEmployees(ids);
      toast.success("Employees deleted successfully");
      setShowDeleteModal(false); // ✅ Close modal
      setSelection([]);           // ✅ Clear selection
      loadEmployees();            // ✅ Refresh table
    } catch (err) {
      toast.error('Failed to delete employees. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadEmployees = () => {
    setLoading(true)
    const payload = {
      department: appliedDeptFilter || '',
      job_status: appliedStatusFilter || '',
      search: appliedGlobalFilterValue || '',
      filters: appliedFilters,
      page,
      per_page: perPage,
      sort_field: sortField,
      sort_order: sortOrder,
    }

    fetchEmployees(payload)
      .then((res) => {
        const next = Array.isArray(res) ? res : res?.employees ?? []
        const meta = Array.isArray(res) ? undefined : res?.meta
        setRows(next)
        if (meta) {
          setTotalRecords(typeof meta.total === 'number' ? meta.total : next.length)
          if (typeof meta.current_page === 'number') setPage(meta.current_page)
          if (typeof meta.per_page === 'number') setPerPage(meta.per_page)
        } else {
          setTotalRecords(next.length)
        }
      })
      .catch((_err) => {
        console.error('Failed to fetch employees', _err)
      })
      .finally(() => setLoading(false))
  }


  const openDeleteModal = () => {
    if (!selection || selection.length === 0) {
      toast.warn('Please select at least one employee to delete.');
      return;
    }
    setDeleteRows(selection); // store selected rows
    setShowDeleteModal(true); // ✅ React modal will now open correctly
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
  };

  return (
    <div className="page-content">
      <ToastContainer position="top-right" autoClose={3000} />
      <div className="container-fluid">
        <div className="row mb-3 pb-1 bg-body">
          <div className="col">
            <div className="h-100">
              <div className="row mb-3 pb-1 page-subheader-sticky bg-body">
                <div className="col-12">
                  <div className="d-flex align-items-center justify-content-between flex-row">
                    <div className="flex-grow-1">
                      <h4 className="fs-20 mb-1">Employees</h4>
                      <nav aria-label="breadcrumb" className="d-none d-sm-block">
                        <ol className="breadcrumb m-0">
                          <li className="breadcrumb-item"><a href="/">Dashboard</a></li>
                          <li className="breadcrumb-item active" aria-current="page">Employees</li>
                        </ol>
                      </nav>
                    </div>
                    <div className="mt-0">
                      <form onSubmit={(e) => e.preventDefault()}>
                        <div className="row g-3 mb-0 align-items-center">
                          <div className="col-sm-auto">
                            <div className="btn-group">
                              {Array.isArray(selection) && selection.length > 0 ? (
                                <>
                                  <button type="button" id="primaryActionBtn" className="btn bg-success text-white fw-medium">
                                    Actions
                                  </button>
                                  <button type="button" id="primaryActionToggleBtn" className="btn bg-success text-white fw-medium dropdown-toggle dropdown-toggle-split" data-bs-toggle="dropdown" aria-expanded="false">
                                    <span className="visually-hidden">Toggle dropdown</span>
                                  </button>
                                  <ul className="dropdown-menu dropdown-menu-end" id="primaryActionMenu">
                                    {/* <li><a className="dropdown-item" href="#" id="exportCsv"><i className="ri-file-text-line me-1 align-bottom"></i> Export CSV</a></li>
                                    <li><a className="dropdown-item" href="#" id="exportExcel"><i className="ri-file-excel-2-line me-1 align-bottom"></i> Export Excel</a></li>
                                    <li><a className="dropdown-item" href="#" id="exportPdf"><i className="ri-file-pdf-2-line me-1 align-bottom"></i> Export PDF</a></li> */}
                                    {/* <li><hr className="dropdown-divider" /></li> */}
                                    <li>
                                      <button
                                        type="button"
                                        className="dropdown-item text-danger"
                                        onClick={openDeleteModal} // ✅ React state handles modal
                                      >
                                        <i className="ri-delete-bin-6-line me-1 align-bottom"></i> Delete Selected
                                      </button>
                                    </li>
                                  </ul>
                                </>
                              ) : (
                                <Link to="/employee-details" id="primaryActionBtn" className="btn btn-primary fw-medium waves-effect waves-light">
                                  <i className="ri-add-fill me-1 align-bottom"></i> Add Employee
                                </Link>
                              )}
                            </div>
                          </div>
                        </div>
                      </form>
                    </div>
                  </div>
                </div>
              </div>

              <div className="row">
                <div className="col-lg-12">
                  <div className="card">
                    <div className="card-body">
                      <form onSubmit={(e) => {
                        e.preventDefault(); // prevent page reload
                        onApplyFilters();   // trigger your search function
                      }}>
                        <div className="row g-3 mb-3">
                          <div className="col-xxl-4 col-sm-12">
                            <div className="search-box">
                              <input
                                type="text"
                                className="form-control search bg-light border-light"

                                autoComplete="off"
                                placeholder="Search here..."
                                value={globalFilterValue}
                                onChange={(e) => setGlobalFilterValue(e.target.value)}  // ✅ keep state updated
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();       // prevent page reload
                                    onApplyFilters();         // trigger your filter/search
                                  }
                                }}
                              />
                              <i className="ri-search-line search-icon"></i>
                            </div>
                          </div>
                          <div className="col-xxl-3 col-sm-4">
                            <div className="input-light">
                              <select className="form-control" onChange={onJobStatusChange}>
                                <option value="Select Employee Status" defaultValue>Job Status</option>
                                <option value="Active">Active</option>
                                <option value="Inactive">Inactive</option>
                              </select>
                            </div>
                          </div>

                          <div className="col-xxl-3 col-sm-4">
                            <div className="input-light">
                              <select
                                className="form-control"
                                name="department"
                                id="idDepartment"
                                onChange={onDeptChange}
                              >
                                <option value="" defaultValue>Select Department</option>
                                {departments.map((dept) => (
                                  <option key={dept.id} value={dept.department}>
                                    {dept.department}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                          <div className="col-xxl-2 col-sm-4">
                            <div className="d-flex gap-2">
                              <button type="button" className="btn btn-warning flex-grow-1" onClick={onApplyFilters}>
                                <i className="ri-equalizer-fill me-1 align-bottom"></i> Filters
                              </button>
                              <button type="button" className="btn btn-outline-secondary flex-grow-1" onClick={onClearFilters}>
                                <i className="ri-close-line me-1 align-bottom"></i> Clear
                              </button>
                            </div>
                          </div>
                        </div>
                      </form>
                      <div>
                        <div className="table-responsive table-card mt-1">
                          <DataTable
                            scrollable
                            scrollHeight="510px"
                            value={rows}
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
                            onFilter={(e) => { setFilters(e.filters); setAppliedFilters(e.filters); setPage(1); }}
                            onPage={onPage}
                            onSort={onSort}
                            globalFilterFields={[
                              'full_name',
                              'phone_number',
                              'email',
                              'department',
                              'designation',
                              'address',
                              'job_status'
                            ]}
                            selection={selection}
                            onSelectionChange={(e) => setSelection(e.value)}
                            dataKey="id"
                            responsiveLayout="scroll"
                            className="p-datatable-sm"
                            loading={loading}
                            emptyMessage="No employees found"
                          >
                            <Column selectionMode="multiple" headerStyle={{ width: '3rem' }} exportable={false}></Column>
                            <Column field="full_name" header="Employee Name" sortable filter showFilterMatchModes filterPlaceholder="Search name" body={nameBody}></Column>
                            <Column field="phone_number" header="Phone" sortable filter showFilterMatchModes filterPlaceholder="(xxx) xxx-xxxx"></Column>
                            <Column field="email" header="Email" sortable filter showFilterMatchModes filterPlaceholder="Search email"></Column>
                            <Column field="department" header="Department" sortable filter showFilterMatchModes filterPlaceholder="Search department"></Column>
                            <Column field="designation" header="Designation" sortable filter showFilterMatchModes filterPlaceholder="Search designation"></Column>
                            <Column field="address" header="Address" sortable filter showFilterMatchModes filterPlaceholder="Search address"></Column>
                            <Column field="job_status" header="Status" sortable filter showFilterMatchModes filterPlaceholder="Search Status" body={statusBodyTemplate}></Column>
                          </DataTable>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <DeleteConfirmationModal
                show={showDeleteModal}
                onConfirm={handleDeleteConfirm}
                onClose={closeDeleteModal}
                loading={loading}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}