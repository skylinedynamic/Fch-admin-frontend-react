import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { DataTable } from 'primereact/datatable'
import { Column } from 'primereact/column'
import { FilterMatchMode, FilterOperator } from 'primereact/api'

export default function Employees() {
  // Sample employees data (from existing static table)
  const employees = [
    { id: 'EMP0001', employee_name: 'Alexis Reed', work_phone: '(415) 555-1010', work_email: 'alexis.reed@company.example', dept: 'Engineering', job_position: 'Software Engineer', location: 'San Francisco, CA', status: 'Full Time' },
    { id: 'EMP0002', employee_name: 'Miguel Alvarez', work_phone: '(312) 555-2234', work_email: 'miguel.alvarez@company.example', dept: 'Sales', job_position: 'Sales Associate', location: 'Chicago, IL', status: 'Part Time' },
    { id: 'EMP0003', employee_name: 'Serena Patel', work_phone: '(503) 555-9933', work_email: 'serena.patel@company.example', dept: 'Marketing', job_position: 'Content Strategist', location: 'Portland, OR', status: 'Contractor' },
    { id: 'EMP0004', employee_name: 'Liam Brooks', work_phone: '(828) 555-4300', work_email: 'liam.brooks@company.example', dept: 'Operations', job_position: 'Project Manager', location: 'Asheville, NC', status: 'Full Time' },
    { id: 'EMP0005', employee_name: 'Chloe Nguyen', work_phone: '(206) 555-7802', work_email: 'chloe.nguyen@company.example', dept: 'HR', job_position: 'Recruiter', location: 'Seattle, WA', status: 'Archived' },
    { id: 'EMP0006', employee_name: 'Ethan Carter', work_phone: '(503) 555-1122', work_email: 'ethan.carter@company.example', dept: 'Product', job_position: 'Product Manager', location: 'Portland, OR', status: 'Full Time' },
    { id: 'EMP0007', employee_name: 'Zara Khan', work_phone: '(415) 555-6700', work_email: 'zara.khan@company.example', dept: 'Data', job_position: 'Data Analyst', location: 'San Francisco, CA', status: 'Contractor' },
    { id: 'EMP0008', employee_name: 'Noah Williams', work_phone: '(313) 555-2299', work_email: 'noah.williams@company.example', dept: 'Manufacturing', job_position: 'Line Supervisor', location: 'Detroit, MI', status: 'Part Time' },
    { id: 'EMP0009', employee_name: 'Isabella Flores', work_phone: '(312) 555-8800', work_email: 'isabella.flores@company.example', dept: 'Logistics', job_position: 'Coordinator', location: 'Chicago, IL', status: 'Full Time' },
    { id: 'EMP0010', employee_name: 'Oliver James', work_phone: '(512) 555-5522', work_email: 'oliver.james@company.example', dept: 'Hospitality', job_position: 'Cafe Manager', location: 'Austin, TX', status: 'Full Time' }
  ]

  // PrimeReact DataTable filters and selection
  const [filters, setFilters] = useState({})
  const [globalFilterValue, setGlobalFilterValue] = useState('')
  const [selection, setSelection] = useState([])

  const initFilters = () => {
    setFilters({
      global: { value: null, matchMode: FilterMatchMode.CONTAINS },
      employee_name: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }] },
      work_phone: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
      work_email: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
      dept: { operator: FilterOperator.OR, constraints: [{ value: null, matchMode: FilterMatchMode.EQUALS }] },
      job_position: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
      location: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
      status: { operator: FilterOperator.OR, constraints: [{ value: null, matchMode: FilterMatchMode.EQUALS }] }
    })
    setGlobalFilterValue('')
  }

  useEffect(() => {
    initFilters()
  }, [])

  const onGlobalFilterChange = (e) => {
    const value = e.target.value
    let _filters = { ...filters }
    _filters['global'].value = value
    setFilters(_filters)
    setGlobalFilterValue(value)
  }

  const nameBody = (rowData) => (
    <Link to="/employee-details" className="fw-medium link-primary">{rowData.employee_name}</Link>
  )
  useEffect(() => {
    // Add cursor-pointer on table rows and handle row click -> navigate to details
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
        // Navigate to employee details (React route)
        window.location.href = '/employee-details'
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
        primaryBtn.innerHTML = '<i class="ri-add-fill me-1 align-bottom"></i> Add Candidate'
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
      download('employees.csv', csv)
    }
    const onExportExcel = (e) => {
      e.preventDefault()
      const rows = getSelectedRows()
      if (!rows.length) return
      const tsv = rows.map((tr) => getRowData(tr).join('\t')).join('\n')
      download('employees.xls', tsv)
    }
    const onExportPdf = (e) => {
      e.preventDefault()
      const rows = getSelectedRows()
      if (!rows.length) return
      const text = rows.map((tr) => getRowData(tr).join(' | ')).join('\n')
      download('employees.txt', text)
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
        tbody = document.getElementById('employees-list-data') || document.querySelector('.form-check-all')
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

  return (
    <div className="page-content">
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
                              <a href="/employee-details" id="primaryActionBtn" className="btn btn-primary fw-medium waves-effect waves-light">
                                <i className="ri-add-fill me-1 align-bottom"></i> Add Candidate
                              </a>
                              <button type="button" id="primaryActionToggleBtn" className="btn btn-primary waves-effect waves-light dropdown-toggle dropdown-toggle-split d-none" data-bs-toggle="dropdown" aria-expanded="false">
                                <span className="visually-hidden">Toggle dropdown</span>
                              </button>
                              <ul className="dropdown-menu dropdown-menu-end d-none" id="primaryActionMenu">
                                <li><a className="dropdown-item" href="#" id="exportCsv"><i className="ri-file-text-line me-1 align-bottom"></i> Export CSV</a></li>
                                <li><a className="dropdown-item" href="#" id="exportExcel"><i className="ri-file-excel-2-line me-1 align-bottom"></i> Export Excel</a></li>
                                <li><a className="dropdown-item" href="#" id="exportPdf"><i className="ri-file-pdf-2-line me-1 align-bottom"></i> Export PDF</a></li>
                                <li><hr className="dropdown-divider" /></li>
                                <li><a className="dropdown-item text-danger" href="#" id="deleteSelected"><i className="ri-delete-bin-6-line me-1 align-bottom"></i> Delete Selected</a></li>
                              </ul>
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
                                id="searchJob"
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
                              <select className="form-control" data-choices data-choices-search-false name="choices-idType" id="idType">
                                <option value="Select Employee Status" defaultValue>Job Status</option>
                                <option value="Active">Full Time</option>
                                <option value="New">Part Time</option>
                                <option value="Close">Contractor</option>
                                <option value="Close">Archived</option>
                              </select>
                            </div>
                          </div>
                          <div className="col-xxl-3 col-sm-4">
                            <div className="input-light">
                              <select className="form-control" data-choices data-choices-search-false name="choices-single-default" id="idStatus">
                                <option value="all" defaultValue>Select Department</option>
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
                            <button type="button" className="btn btn-warning w-100">
                              <i className="ri-equalizer-fill me-1 align-bottom"></i> Filters
                            </button>
                          </div>
                        </div>
                      </form>
                      <div>
                        <div className="table-responsive table-card mt-1">
                          <DataTable
                            value={employees}
                            paginator
                            rows={10}
                            rowsPerPageOptions={[10, 25, 50, 100]}
                            sortMode="multiple"
                            filterDisplay="menu"
                            filters={filters}
                            onFilter={(e) => setFilters(e.filters)}
                            globalFilterFields={[
                              'employee_name',
                              'work_phone',
                              'work_email',
                              'dept',
                              'job_position',
                              'location',
                              'status'
                            ]}
                            selection={selection}
                            onSelectionChange={(e) => setSelection(e.value)}
                            dataKey="id"
                            responsiveLayout="scroll"
                            className="p-datatable-sm"
                            emptyMessage="No employees found"
                          >
                            <Column selectionMode="multiple" headerStyle={{ width: '3rem' }} exportable={false}></Column>
                            <Column field="employee_name" header="Employee Name" sortable filter showFilterMatchModes filterPlaceholder="Search name" body={nameBody}></Column>
                            <Column field="work_phone" header="Work Phone" sortable filter showFilterMatchModes filterPlaceholder="(xxx) xxx-xxxx"></Column>
                            <Column field="work_email" header="Work Email" sortable filter showFilterMatchModes></Column>
                            <Column field="dept" header="Department" sortable filter showFilterMatchModes></Column>
                            <Column field="job_position" header="Job Position" sortable filter showFilterMatchModes></Column>
                            <Column field="location" header="Location" sortable filter showFilterMatchModes></Column>
                            <Column field="status" header="Job Status" sortable filter showFilterMatchModes></Column>
                          </DataTable>
                        </div>
                      </div>

                      {/* Delete Confirmation Modal */}
                      <div className="modal fade flip" id="deleteOrder" tabIndex="-1" aria-labelledby="deleteOrderLabel" aria-hidden="true" role="dialog">
                        <div className="modal-dialog modal-dialog-centered">
                          <div className="modal-content">
                            <div className="modal-body p-5 text-center">
                              <lord-icon src="https://cdn.lordicon.com/gsqxdxog.json" trigger="loop" colors="primary:#405189,secondary:#f06548" style={{ width: '90px', height: '90px' }}></lord-icon>
                              <div className="mt-4 text-center">
                                <h4 id="deleteOrderLabel">Are you sure ?</h4>
                                <p className="text-muted fs-15 mb-4">Deleting your demo request will remove all of information from our database.</p>
                                <div className="hstack gap-2 justify-content-center remove">
                                  <button className="btn btn-link link-success fw-medium text-decoration-none" id="deleteRecord-close" data-bs-dismiss="modal"><i className="ri-close-line me-1 align-middle"></i> Close</button>
                                  <button className="btn btn-danger" id="delete-record">Yes, Delete It</button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  )
}