import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { DataTable } from '../../components/Table/DataTableWrapper'
import { Column } from 'primereact/column'
import { Dropdown } from 'primereact/dropdown'
import { FilterMatchMode, FilterOperator } from 'primereact/api'
import { fetchUsers, createUser, fetchRoles, updateUser, deleteUser } from '../../modules/user/services';
import '../../../assets/css/bootstrap.min.css';

import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function Users() {

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
  const [sortOrder, setSortOrder] = useState('desc')
  const [totalRecords, setTotalRecords] = useState(0)
  const [appliedFilters, setAppliedFilters] = useState({})
  const [appliedGlobalFilterValue, setAppliedGlobalFilterValue] = useState('')
  const [appliedRoleFilter, setappliedRoleFilter] = useState('')
  const [appliedStatusFilter, setAppliedStatusFilter] = useState('')

  const [showAddUser, setShowAddUser] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [roles, setRoles] = useState([]);
  const [editingUserId, setEditingUserId] = useState(null); 
  const [deletingUserId, setDeletingUserId] = useState(null);

  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    phone_number: '',
    role_id: '',
    status: 'active',
    old_password: '',
    new_password: '',
    confirm_password: '',
  });

  const statusOptions = [
    { label: 'Active', value: 'Active' },
    { label: 'Inactive', value: 'Inactive' }
  ]

  const initFilters = () => {
    const initial = {
      global: { value: null, matchMode: FilterMatchMode.CONTAINS },
      name: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }] },
      phone_number: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
      email: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
      role: { operator: FilterOperator.OR, constraints: [{ value: null, matchMode: FilterMatchMode.EQUALS }] },
      status: { operator: FilterOperator.OR, constraints: [{ value: null, matchMode: FilterMatchMode.EQUALS }] }
    }
    setFilters(initial)
    setAppliedFilters(initial)
    setGlobalFilterValue('')
    setAppliedGlobalFilterValue('')
  }

  useEffect(() => {
    initFilters()
    loadRoles();
  }, [])

  const loadRoles = async () => {
    const roleList = await fetchRoles();
    setRoles(roleList);
  };

  const onGlobalFilterChange = (e) => {
    const value = e.target.value
    let _filters = { ...filters }
    _filters['global'].value = value
    setFilters(_filters)
    setGlobalFilterValue(value)
  }

  const nameBody = (rowData) => (
    <Link to="/users-details" className="fw-medium link-primary">{rowData.name}</Link>
  )

  // Status column body template
  const statusBodyTemplate = (rowData) => {
    const value = rowData?.status || rowData?.status || ''
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

  const onStatusChange = (e) => {
    const val = e.target.value
    setStatusFilter(val === 'Select User Status' ? '' : val)
  }

  const onDeptChange = (e) => {
    const val = e.target.value
    setDeptFilter(val === 'all' || val === 'Select Department' ? '' : val)
  }

  const onApplyFilters = () => {
    setAppliedGlobalFilterValue(globalFilterValue || '')
    setappliedRoleFilter(deptFilter || '')
    setAppliedStatusFilter(statusFilter || '')
    setAppliedFilters(filters)
    setPage(1)
  }

  const onClearFilters = () => {
    const preservedRole = filters?.role
    const preservedStatus = filters?.status

    const reset = {
      global: { value: null, matchMode: FilterMatchMode.CONTAINS },
      name: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }] },
      phone_number: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
      email: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
      role: preservedRole ?? { operator: FilterOperator.OR, constraints: [{ value: null, matchMode: FilterMatchMode.EQUALS }] },
      status: preservedStatus ?? { operator: FilterOperator.OR, constraints: [{ value: null, matchMode: FilterMatchMode.EQUALS }] }
    }
    setGlobalFilterValue('')
    setAppliedGlobalFilterValue('')
    setFilters(reset)
    setAppliedFilters(reset)
    setPage(1)
  }

  useEffect(() => {
    // Only fetch when filters are applied (via button) or table interactions
    if (!appliedFilters || Object.keys(appliedFilters).length === 0) return
    setLoading(true) // show skeleton before API call
    const timeout = setTimeout(() => {
      const payload = {
        role: appliedRoleFilter || '',
        status: appliedStatusFilter || '',
        search: appliedGlobalFilterValue || '',
        filters: appliedFilters,
        page,
        per_page: perPage,
        sort_field: sortField,
        sort_order: sortOrder,
      }
      fetchUsers(payload)
        .then((res) => {
          console.log(res);
          const next = Array.isArray(res) ? res : (res?.data ?? [])
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
          // keep existing rows on error
        })
        .finally(() => setLoading(false))
    }, 300)
    return () => clearTimeout(timeout)
  }, [appliedRoleFilter, appliedStatusFilter, appliedGlobalFilterValue, appliedFilters, page, perPage, sortField, sortOrder])

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
    // Add cursor-pointer on table rows and handle row click -> navigate to details
    const tbody = document.getElementById('users-list-data')
    if (tbody) {
      Array.prototype.forEach.call(tbody.querySelectorAll('tr'), (tr) => {
        tr.classList.add('cursor-pointer')
      })
      const onTbodyClick = (e) => {
        const target = e.target
        if (target.closest('a, button, input, label, [data-bs-toggle], .remove-item-btn')) return
        const row = target.closest('tr')
        if (!row) return
        // Navigate to user details (React route)
        window.location.href = '/user-details'
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
    let tbody = document.getElementById('users-list-data') || document.querySelector('.form-check-all')
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
        primaryBtn.innerHTML = '<i class="ri-add-fill me-1 align-bottom"></i> Add User'
        if (originalHref) primaryBtn.setAttribute('href', originalHref)
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

    // Export/Delete actions
    const getSelectedRows = () => {
      const scope = tbody || document
      const selector = tbody
        ? 'input.form-check-input[name="chk_child"]:checked'
        : '.form-check-all input.form-check-input[name="chk_child"]:checked'
      return Array.from(scope.querySelectorAll(selector)).map((cb) => cb.closest('tr'))
    }
    const getRowData = (tr) => {
      const cells = tr.querySelectorAll('td')
      return Array.from(cells).map((td) => td.innerText.trim().replace(/\s+/g, ' '))
    }
    const download = (filename, text) => {
      const a = document.createElement('a')
      a.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text))
      a.setAttribute('download', filename)
      a.style.display = 'none'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    }
    const exportCsvBtn = document.getElementById('exportCsv')
    const exportExcelBtn = document.getElementById('exportExcel')
    const exportPdfBtn = document.getElementById('exportPdf')
    const deleteSelectedBtn = document.getElementById('deleteSelected')

    const onExportCsv = (e) => {
      e.preventDefault()
      const rows = getSelectedRows()
      if (!rows.length) return
      const csv = rows.map((tr) => getRowData(tr).join(',')).join('\n')
      download('users.csv', csv)
    }
    const onExportExcel = (e) => {
      e.preventDefault()
      const rows = getSelectedRows()
      if (!rows.length) return
      const tsv = rows.map((tr) => getRowData(tr).join('\t')).join('\n')
      download('users.xls', tsv)
    }
    const onExportPdf = (e) => {
      e.preventDefault()
      const rows = getSelectedRows()
      if (!rows.length) return
      const text = rows.map((tr) => getRowData(tr).join(' | ')).join('\n')
      download('users.txt', text)
    }
    const onDeleteSelected = (e) => {
      e.preventDefault()
      const rows = getSelectedRows()
      if (!rows.length) return
      const modalEl = document.getElementById('deleteOrder')
      if (!modalEl || !window.bootstrap) return
      const modal = new window.bootstrap.Modal(modalEl)
      modal.show()
      const confirmBtn = document.getElementById('delete-record')
      const closeBtn = document.getElementById('deleteRecord-close')
      const onConfirm = () => {
        rows.forEach((tr) => tr.remove())
        // refresh rowChecks after deletion
        tbody = document.getElementById('users-list-data') || document.querySelector('.form-check-all')
        rowChecks = (tbody
          ? tbody.querySelectorAll('input.form-check-input[name="chk_child"]')
          : document.querySelectorAll('.form-check-all input.form-check-input[name="chk_child"]'))
        syncHeaderState()
        updatePrimaryBtnLabel()
        modal.hide()
        confirmBtn && confirmBtn.removeEventListener('click', onConfirm)
        closeBtn && closeBtn.removeEventListener('click', onClose)
      }
      const onClose = () => {
        modal.hide()
        confirmBtn && confirmBtn.removeEventListener('click', onConfirm)
        closeBtn && closeBtn.removeEventListener('click', onClose)
      }
      confirmBtn && confirmBtn.addEventListener('click', onConfirm)
      closeBtn && closeBtn.addEventListener('click', onClose)
    }

    exportCsvBtn && exportCsvBtn.addEventListener('click', onExportCsv)
    exportExcelBtn && exportExcelBtn.addEventListener('click', onExportExcel)
    exportPdfBtn && exportPdfBtn.addEventListener('click', onExportPdf)
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
      exportCsvBtn && exportCsvBtn.removeEventListener('click', onExportCsv)
      exportExcelBtn && exportExcelBtn.removeEventListener('click', onExportExcel)
      exportPdfBtn && exportPdfBtn.removeEventListener('click', onExportPdf)
      deleteSelectedBtn && deleteSelectedBtn.removeEventListener('click', onDeleteSelected)
      observer && observer.disconnect()
    }
  }, [])

    const handleAddUserSubmit = async (e) => {
      e.preventDefault();
  
      // Password validation only if new password is provided
      if (editingUserId && newUser.new_password) {
        if (newUser.new_password !== newUser.confirm_password) {
          toast.error("New password and confirm password do not match");
          return;
        }
      }
  
      // Prepare payload, only send new_password if filled
      const payload = {
        name: newUser.name,
        email: newUser.email,
        phone_number: newUser.phone_number,
        role_id: newUser.role_id,
        status: newUser.status,
      };
  
      if (editingUserId && newUser.new_password) {
        payload.password = newUser.new_password;
      }
  
      if (!editingUserId) {
        payload.password = newUser.old_password; // For new user, password is required
      }
  
      try {
        if (editingUserId) {
          await updateUser(editingUserId, payload);
          toast.success("User updated successfully");
        } else {
          await createUser(payload);
          toast.success("User created successfully");
        }
  
        // loadUsers();
        // setNewUser({
        //   name: '',
        //   email: '',
        //   phone_number: '',
        //   role_id: '',
        //   status: 'active',
        //   old_password: '',
        //   new_password: '',
        //   confirm_password: '',
        // });
        setShowAddUser(false);
        setEditingUserId(null);
      } catch (error) {
        toast.error("Failed to save user");
        console.error(error);
      }
    };

      const handleAddUserInput = (e) => {
        const { name, value } = e.target;
        setNewUser({ ...newUser, [name]: value });
      };
    
      const handleDeleteUser = async () => {
        try {
          await deleteUser(deletingUserId);
          toast.success("User deleted successfully");
          setShowDeleteModal(false);
          setDeletingUserId(null);
        } catch (error) {
          toast.error("Failed to delete user");
          console.error(error);
        }
      };
    
      const nameBodyTemplate = (rowData) => (
        <span
          className="fw-medium link-primary"
          style={{ cursor: 'pointer' }}
          onClick={() => {
            setEditingUserId(rowData.id);
            setNewUser({
              name: rowData.name || '',
              email: rowData.email || '',
              phone_number: rowData.phone_number || '',
              role_id: rowData.role_id || '',
              status: rowData.status || 'active',
              old_password: '',
              new_password: '',
              confirm_password: '',
            });
            setShowAddUser(true);
          }}
        >
          {rowData.name}
        </span>
      );
  

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
                      <h4 className="fs-20 mb-1">Users</h4>
                      <nav aria-label="breadcrumb" className="d-none d-sm-block">
                        <ol className="breadcrumb m-0">
                          <li className="breadcrumb-item"><a href="/">Dashboard</a></li>
                          <li className="breadcrumb-item active" aria-current="page">Users</li>
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
                                    <li><a className="dropdown-item" href="#" id="exportCsv"><i className="ri-file-text-line me-1 align-bottom"></i> Export CSV</a></li>
                                    <li><a className="dropdown-item" href="#" id="exportExcel"><i className="ri-file-excel-2-line me-1 align-bottom"></i> Export Excel</a></li>
                                    <li><a className="dropdown-item" href="#" id="exportPdf"><i className="ri-file-pdf-2-line me-1 align-bottom"></i> Export PDF</a></li>
                                    <li><hr className="dropdown-divider" /></li>
                                    <li><a className="dropdown-item text-danger" href="#" id="deleteSelected"><i className="ri-delete-bin-6-line me-1 align-bottom"></i> Delete Selected</a></li>
                                  </ul>
                                </>
                              ) : (
                               <button className="btn btn-primary fw-medium" onClick={() => {
                                  setShowAddUser(true);
                                  setEditingUserId(null);
                                  setNewUser({ name: '', email: '', phone_number: '', role_id: '', status: 'active', old_password: '', new_password: '', confirm_password: '' });
                                }}>
                                  <i className="ri-add-fill me-1 align-bottom"></i> Add User
                              </button>
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
                      <form>
                        <div className="row g-3 mb-3">
                          <div className="col-xxl-4 col-sm-12">
                            <div className="search-box">
                              <input
                                type="text"
                                className="form-control search bg-light border-light"
                                id="searchStatus"
                                autoComplete="off"
                                placeholder="Search here..."
                                value={globalFilterValue}
                                onChange={onGlobalFilterChange}
                              />
                              <i className="ri-search-line search-icon"></i>
                            </div>
                          </div>
                          <div className="col-xxl-3 col-sm-4">
                            <div className="input-light">
                              <select className="form-control" data-choices data-choices-search-false name="choices-idType" id="idType" onChange={onStatusChange}>
                                <option value="Select User Status" defaultValue>Status</option>
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                              </select>
                            </div>
                          </div>
                          <div className="col-xxl-3 col-sm-4">
                            <div className="input-light">
                              <select className="form-control" data-choices data-choices-search-false name="choices-single-default" id="idStatus" onChange={onDeptChange}>
                                <option value="all" defaultValue>Select Role</option>
                                <option value="Active">Engineering</option>
                                <option value="New">Sales</option>
                                <option value="Close">Marketing</option>
                                <option value="Active">Opetations</option>
                                <option value="New">HR</option>
                                <option value="Close">Product</option>
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
                              'status'
                            ]}
                            selection={selection}
                            onSelectionChange={(e) => setSelection(e.value)}
                            dataKey="id"
                            responsiveLayout="scroll"
                            className="p-datatable-sm"
                            loading={loading}
                            emptyMessage="No Users found"
                          >
                            <Column selectionMode="multiple" headerStyle={{ width: '3rem' }} exportable={false}></Column>
                            <Column field="name" header="User Name" sortable filter showFilterMatchModes filterPlaceholder="Search name" body={nameBody}></Column>
                            <Column field="phone_number" header="Phone" sortable filter showFilterMatchModes filterPlaceholder="(xxx) xxx-xxxx"></Column>
                            <Column field="email" header="Email" sortable filter showFilterMatchModes filterPlaceholder="Search email"></Column>
                            <Column field="role" header="Role" sortable filter showFilterMatchModes filterPlaceholder="Search Role"></Column>
                            <Column
                              field="status"
                              header="Status"
                              showFilterMenu
                              filterMenuStyle={{ width: '14rem' }}
                              body={statusBodyTemplate}
                              filter
                              filterElement={statusRowFilterTemplate}
                            />
                            <Column
                              header="Action"
                              body={(rowData) => (
                                <>
                                  <button
                                    className="btn btn-sm btn-primary me-2"
                                    onClick={() => {
                                      setEditingUserId(rowData.id);
                                      setNewUser({
                                        name: rowData.name || '',
                                        email: rowData.email || '',
                                        phone_number: rowData.phone_number || '',
                                        role_id: rowData.role || '',
                                        status: rowData.status || 'active',
                                        new_password: '',
                                        confirm_password: '',
                                      });
                                      setShowAddUser(true);
                                    }}
                                  >
                                    <i className="ri-edit-2-fill me-1 align-bottom"></i> Edit
                                  </button>
                                  <button
                                    className="btn btn-sm btn-danger"
                                    onClick={() => {
                                      setDeletingUserId(rowData.id);
                                      setShowDeleteModal(true);
                                    }}
                                  >
                                    <i className="ri-delete-bin-6-fill me-1 align-bottom"></i> Delete
                                  </button>
                                </>
                              )}
                              style={{ textAlign: 'center', width: '12rem' }}
                            />
                          </DataTable>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>



               {/* Add/Edit User Modal */}
      {showAddUser && (
        <>
          <div className="modal fade show d-block" tabIndex="-1" role="dialog">
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">{editingUserId ? 'Update User' : 'Add User'}</h5>
                  <button type="button" className="btn-close" onClick={() => {
                    setShowAddUser(false);
                    setEditingUserId(null);
                  }}></button>
                </div>
                <div className="modal-body">
                  <form onSubmit={handleAddUserSubmit}>
                    <div className="mb-3">
                      <label className="form-label">Name</label>
                      <input type="text" name="name" className="form-control" value={newUser.name} onChange={handleAddUserInput} required />
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Email</label>
                      <input type="email" name="email" className="form-control" value={newUser.email} onChange={handleAddUserInput} required />
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Phone</label>
                      <input type="text" name="phone_number" className="form-control" value={newUser.phone_number} onChange={handleAddUserInput} required />
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Role</label>
                      <select
                        name="role_id"
                        className="form-control"
                        value={newUser.role_id}
                        onChange={handleAddUserInput}
                        required
                      >
                        <option value="">Select Role</option>
                        {roles.map((role) => (
                          <option key={role.id} value={role.id}>{role.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Status</label>
                      <select
                        name="status"
                        className="form-control"
                        value={newUser.status}
                        onChange={handleAddUserInput}
                        required
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>

                    {/* Password Fields - optional on edit */}
                    {editingUserId ? (
                        <>
                          <div className="mb-3">
                            <label className="form-label">New Password</label>
                            <input
                              type="password"
                              name="new_password"
                              className="form-control"
                              value={newUser.new_password}
                              onChange={handleAddUserInput}
                              placeholder="Optional"
                            />
                          </div>
                          <div className="mb-3">
                            <label className="form-label">Confirm Password</label>
                            <input
                              type="password"
                              name="confirm_password"
                              className="form-control"
                              value={newUser.confirm_password}
                              onChange={handleAddUserInput}
                              placeholder="Optional"
                            />
                          </div>
                        </>
                      ) : null}

                    <div className="d-flex justify-content-end">
                      <button type="button" className="btn btn-secondary me-2" onClick={() => {
                        setShowAddUser(false);
                        setEditingUserId(null);
                      }}>Cancel</button>
                      <button type="submit" className="btn btn-primary">
                        <i className="ri-save-3-fill me-1 align-bottom"></i> {editingUserId ? 'Update' : 'Save'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show"></div>
        </>
      )}

            {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <>
          <div className="modal fade show d-block" tabIndex="-1" role="dialog">
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Confirm Delete</h5>
                  <button type="button" className="btn-close" onClick={() => setShowDeleteModal(false)}></button>
                </div>
                <div className="modal-body">
                  Are you sure you want to delete this user?
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowDeleteModal(false)}>Cancel</button>
                  <button type="button" className="btn btn-danger" onClick={handleDeleteUser}>Delete</button>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show"></div>
        </>
      )}



            </div>
          </div>
        </div>
      </div>
    </div>
  )
}