import React, { useEffect } from 'react'

export default function Users() {
  useEffect(() => {
    // Row click: navigate to a details page (placeholder for now)
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
        // Navigate to details (could be /user-details in future)
        window.location.href = '/employees' // keep navigation consistent until user-details exists
      }
      tbody.addEventListener('click', onTbodyClick)
      return () => tbody.removeEventListener('click', onTbodyClick)
    }
  }, [])

  useEffect(() => {
    // Initialize Choices.js for selects when available
    const selects = document.querySelectorAll('[data-choices]')
    selects.forEach((el) => {
      try {
        if (window.Choices && typeof window.Choices === 'function') {
          if (!el._choicesInstance) {
            const instance = new window.Choices(el, { searchEnabled: false })
            el._choicesInstance = instance
          }
        }
      } catch (_) {}
    })
  }, [])

  useEffect(() => {
    // Select All checkbox and actions dropdown
    const headerCheck = document.getElementById('checkAllUsers')
    let tbody = document.getElementById('users-list-data') || document.querySelector('.form-check-all-users')
    let rowChecks = (tbody
      ? tbody.querySelectorAll('input.form-check-input[name="chk_child_users"]')
      : document.querySelectorAll('.form-check-all-users input.form-check-input[name="chk_child_users"]'))
    const primaryBtn = document.getElementById('primaryActionBtnUsers')
    const originalHref = primaryBtn ? primaryBtn.getAttribute('href') : null
    const toggleBtn = document.getElementById('primaryActionToggleBtnUsers')
    const actionMenu = document.getElementById('primaryActionMenuUsers')

    const preventPrimaryNavigate = (e) => e.preventDefault()

    const syncHeaderState = () => {
      if (!tbody || !headerCheck) return
      const total = rowChecks.length
      const checked = (tbody
        ? tbody.querySelectorAll('input.form-check-input[name="chk_child_users"]:checked').length
        : document.querySelectorAll('.form-check-all-users input.form-check-input[name="chk_child_users"]:checked').length)
      headerCheck.checked = checked === total && total > 0
      headerCheck.indeterminate = checked > 0 && checked < total
    }

    const updatePrimaryBtnLabel = () => {
      if (!primaryBtn) return
      const selected = (tbody
        ? tbody.querySelectorAll('input.form-check-input[name="chk_child_users"]:checked').length
        : document.querySelectorAll('.form-check-all-users input.form-check-input[name="chk_child_users"]:checked').length)
      if (selected > 0) {
        primaryBtn.innerHTML = ' Actions'
        primaryBtn.classList.remove('btn-primary')
        primaryBtn.classList.add('bg-success', 'text-white', 'fw-medium')
        primaryBtn.addEventListener('click', preventPrimaryNavigate)
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
        primaryBtn.removeEventListener('click', preventPrimaryNavigate)
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
      syncHeaderState(); updatePrimaryBtnLabel()
    }
    const onRowChange = () => { syncHeaderState(); updatePrimaryBtnLabel() }

    if (headerCheck) headerCheck.addEventListener('change', onHeaderChange)
    rowChecks.forEach((cb) => cb.addEventListener('change', onRowChange))
    syncHeaderState(); updatePrimaryBtnLabel()

    // Export/Delete actions (IDs scoped for Users)
    const getSelectedRows = () => {
      const scope = tbody || document
      const selector = tbody
        ? 'input.form-check-input[name="chk_child_users"]:checked'
        : '.form-check-all-users input.form-check-input[name="chk_child_users"]:checked'
      return Array.from(scope.querySelectorAll(selector)).map((cb) => cb.closest('tr'))
    }
    const getRowData = (tr) => Array.from(tr.querySelectorAll('td')).map((td) => td.innerText.trim().replace(/\s+/g, ' '))
    const download = (filename, text) => {
      const a = document.createElement('a')
      a.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text))
      a.setAttribute('download', filename)
      a.style.display = 'none'
      document.body.appendChild(a); a.click(); document.body.removeChild(a)
    }
    const exportCsvBtn = document.getElementById('exportCsvUsers')
    const exportExcelBtn = document.getElementById('exportExcelUsers')
    const exportPdfBtn = document.getElementById('exportPdfUsers')
    const deleteSelectedBtn = document.getElementById('deleteSelectedUsers')

    const onExportCsv = (e) => { e.preventDefault(); const rows = getSelectedRows(); if (!rows.length) return; const csv = rows.map((tr) => getRowData(tr).join(',')).join('\n'); download('users.csv', csv) }
    const onExportExcel = (e) => { e.preventDefault(); const rows = getSelectedRows(); if (!rows.length) return; const tsv = rows.map((tr) => getRowData(tr).join('\t')).join('\n'); download('users.xls', tsv) }
    const onExportPdf = (e) => { e.preventDefault(); const rows = getSelectedRows(); if (!rows.length) return; const text = rows.map((tr) => getRowData(tr).join(' | ')).join('\n'); download('users.txt', text) }
    const onDeleteSelected = (e) => { e.preventDefault(); const rows = getSelectedRows(); if (!rows.length) return; const modalEl = document.getElementById('deleteOrder'); if (!modalEl || !window.bootstrap) return; const modal = new window.bootstrap.Modal(modalEl); modal.show(); const confirmBtn = document.getElementById('delete-record'); const closeBtn = document.getElementById('deleteRecord-close'); const onConfirm = () => { rows.forEach((tr) => tr.remove()); tbody = document.getElementById('users-list-data') || document.querySelector('.form-check-all-users'); rowChecks = (tbody ? tbody.querySelectorAll('input.form-check-input[name="chk_child_users"]') : document.querySelectorAll('.form-check-all-users input.form-check-input[name="chk_child_users"]')); syncHeaderState(); updatePrimaryBtnLabel(); modal.hide(); confirmBtn && confirmBtn.removeEventListener('click', onConfirm); closeBtn && closeBtn.removeEventListener('click', onClose) }; const onClose = () => { modal.hide(); confirmBtn && confirmBtn.removeEventListener('click', onConfirm); closeBtn && closeBtn.removeEventListener('click', onClose) }; confirmBtn && confirmBtn.addEventListener('click', onConfirm); closeBtn && closeBtn.addEventListener('click', onClose) }

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
      sentinel.style.position = 'relative'; sentinel.style.height = '1px'
      sticky.parentNode && sticky.parentNode.insertBefore(sentinel, sticky)
      observer = new IntersectionObserver((entries) => {
        const e = entries[0]
        if (e.isIntersecting) sticky.classList.remove('is-stuck')
        else sticky.classList.add('is-stuck')
      }, { rootMargin: '-' + topOffset + 'px 0px 0px 0px', threshold: [0, 1] })
      observer.observe(sentinel)
    }

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

  useEffect(() => {
    // Sorting and search using List.js; alias classes to header data-sort
    const initSorting = () => {
      const valueNames = ['name', 'email', 'phone', 'role', 'status']
      try {
        const list = new window.List('usersTable', {
          listClass: 'list',
          valueNames,
          searchClass: 'search'
        })
        const container = document.getElementById('usersTable')
        if (container) container._listInstance = list
      } catch (_) {}
    }
    if (window.List) { initSorting(); return }
    const script = document.createElement('script')
    script.src = '/assets/libs/list.js/list.min.js'
    script.async = true
    script.onload = initSorting
    document.body.appendChild(script)
    return () => { try { document.body.removeChild(script) } catch(_) {} }
  }, [])

  useEffect(() => {
    // Role/Status filters: show rows matching selected values (or all)
    const roleSelect = document.getElementById('userRole')
    const statusSelect = document.getElementById('userStatus')
    const tbody = document.getElementById('users-list-data')
    if (!tbody) return

    const applyFilters = () => {
      const role = roleSelect ? roleSelect.value : 'all'
      const status = statusSelect ? statusSelect.value : 'all'
      Array.from(tbody.querySelectorAll('tr')).forEach((tr) => {
        const roleText = (tr.querySelector('.role')?.textContent || '').trim()
        const statusText = (tr.querySelector('.status')?.textContent || '').trim()
        const roleOk = role === 'all' || roleText === role
        // status badge may contain extra text; check includes
        const statusOk = status === 'all' || statusText.includes(status)
        tr.style.display = roleOk && statusOk ? '' : 'none'
      })
    }

    const onChange = () => applyFilters()
    roleSelect && roleSelect.addEventListener('change', onChange)
    statusSelect && statusSelect.addEventListener('change', onChange)
    applyFilters()

    return () => {
      roleSelect && roleSelect.removeEventListener('change', onChange)
      statusSelect && statusSelect.removeEventListener('change', onChange)
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
                              <a href="/employees" id="primaryActionBtnUsers" className="btn btn-primary fw-medium waves-effect waves-light">
                                <i className="ri-add-fill me-1 align-bottom"></i> Add User
                              </a>
                              <button type="button" id="primaryActionToggleBtnUsers" className="btn btn-primary waves-effect waves-light dropdown-toggle dropdown-toggle-split d-none" data-bs-toggle="dropdown" aria-expanded="false">
                                <span className="visually-hidden">Toggle dropdown</span>
                              </button>
                              <ul className="dropdown-menu dropdown-menu-end d-none" id="primaryActionMenuUsers">
                                <li><a className="dropdown-item" href="#" id="exportCsvUsers"><i className="ri-file-text-line me-1 align-bottom"></i> Export CSV</a></li>
                                <li><a className="dropdown-item" href="#" id="exportExcelUsers"><i className="ri-file-excel-2-line me-1 align-bottom"></i> Export Excel</a></li>
                                <li><a className="dropdown-item" href="#" id="exportPdfUsers"><i className="ri-file-pdf-2-line me-1 align-bottom"></i> Export PDF</a></li>
                                <li><hr className="dropdown-divider" /></li>
                                <li><a className="dropdown-item text-danger" href="#" id="deleteSelectedUsers"><i className="ri-delete-bin-6-line me-1 align-bottom"></i> Delete Selected</a></li>
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
                              <input type="text" className="form-control search bg-light border-light" id="searchUser" autoComplete="off" placeholder="Search here..." />
                              <i className="ri-search-line search-icon"></i>
                            </div>
                          </div>
                          <div className="col-xxl-3 col-sm-4">
                            <div className="input-light">
                              <select className="form-control" data-choices data-choices-search-false name="choices-userRole" id="userRole">
                                <option value="all" defaultValue>Select Role</option>
                                <option value="Admin">Admin</option>
                                <option value="Manager">Manager</option>
                                <option value="Staff">Staff</option>
                                <option value="Guest">Guest</option>
                              </select>
                            </div>
                          </div>
                          <div className="col-xxl-3 col-sm-4">
                            <div className="input-light">
                              <select className="form-control" data-choices data-choices-search-false name="choices-userStatus" id="userStatus">
                                <option value="all" defaultValue>Select Status</option>
                                <option value="Active">Active</option>
                                <option value="Inactive">Inactive</option>
                                <option value="Suspended">Suspended</option>
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
                          <style>{`
      /* Increase users table row height by ~10px total */
      #usersTable > :not(caption) > * > * {
        padding-top: calc(.75rem + 5px);
        padding-bottom: calc(.75rem + 5px);
      }
    `}</style>
                          <table className="table align-middle table-nowrap table-hover table-striped" id="usersTable">
                            <thead className="table-light">
                              <tr>
                                <th scope="col" style={{ width: '50px' }}>
                                  <div className="form-check">
                                    <input className="form-check-input" type="checkbox" id="checkAllUsers" value="option" />
                                  </div>
                                </th>
                                <th className="text-uppercase" data-sort="name">Name</th>
                                <th className="text-uppercase" data-sort="email">Email</th>
                                <th className="text-uppercase" data-sort="phone">Phone Number</th>
                                <th className="text-uppercase" data-sort="role">Role</th>
                                <th className="text-uppercase" data-sort="status">Status</th>
                              </tr>
                            </thead>
                            <tbody className="list form-check-all-users" id="users-list-data">
                              <tr>
                                <th scope="row">
                                  <div className="form-check">
                                    <input className="form-check-input" type="checkbox" name="chk_child_users" value="#USR0001" />
                                  </div>
                                </th>
                                <td className="name"><a href="/employees" className="fw-medium link-primary">Alex Johnson</a></td>
                                <td className="email">alex.johnson@example.com</td>
                                <td className="phone">(415) 555-1001</td>
                                <td className="role">Admin</td>
                                <td className="status"><span className="badge rounded-pill bg-success text-white text-uppercase fw-semibold px-3 py-1">Active</span></td>
                              </tr>
                              <tr>
                                <th scope="row">
                                  <div className="form-check">
                                    <input className="form-check-input" type="checkbox" name="chk_child_users" value="#USR0002" />
                                  </div>
                                </th>
                                <td className="name"><a href="/employees" className="fw-medium link-primary">Maria Gomez</a></td>
                                <td className="email">maria.gomez@example.com</td>
                                <td className="phone">(312) 555-2235</td>
                                <td className="role">Manager</td>
                                <td className="status"><span className="badge rounded-pill bg-success text-white text-uppercase fw-semibold px-3 py-1">Active</span></td>
                              </tr>
                              <tr>
                                <th scope="row">
                                  <div className="form-check">
                                    <input className="form-check-input" type="checkbox" name="chk_child_users" value="#USR0003" />
                                  </div>
                                </th>
                                <td className="name"><a href="/employees" className="fw-medium link-primary">Chen Wu</a></td>
                                <td className="email">chen.wu@example.com</td>
                                <td className="phone">(206) 555-7803</td>
                                <td className="role">Staff</td>
                                <td className="status"><span className="badge rounded-pill bg-warning text-dark text-uppercase fw-semibold px-3 py-1">Inactive</span></td>
                              </tr>
                              <tr>
                                <th scope="row">
                                  <div className="form-check">
                                    <input className="form-check-input" type="checkbox" name="chk_child_users" value="#USR0004" />
                                  </div>
                                </th>
                                <td className="name"><a href="/employees" className="fw-medium link-primary">Nora Patel</a></td>
                                <td className="email">nora.patel@example.com</td>
                                <td className="phone">(512) 555-5523</td>
                                <td className="role">Guest</td>
                                <td className="status"><span className="badge rounded-pill bg-danger text-white text-uppercase fw-semibold px-3 py-1">Suspended</span></td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Footer / Pagination placeholder to match design */}
                      <div className="row align-items-center mt-4">
                        <div className="col-sm-6">
                          <div className="text-muted">
                            <p className="mb-sm-0 text-muted">Showing <span className="fw-semibold">1</span> to <span className="fw-semibold">4</span> of <span className="fw-semibold text-decoration-underline">4</span> entries</p>
                          </div>
                        </div>
                        <div className="col-sm-6">
                          <div className="d-flex justify-content-center justify-content-sm-end align-items-baseline gap-2">
                            <div className="datatable me-2">
                              <label className="mb-0 text-muted d-flex align-items-baseline gap-2 fw-normal">Show
                                <select name="users-rows_length" className="form-select form-select-sm d-inline-block w-auto align-middle pt-1 pb-1">
                                  <option value="10" defaultValue>10</option>
                                  <option value="25">25</option>
                                  <option value="50">50</option>
                                  <option value="100">100</option>
                                </select>
                                entries
                              </label>
                            </div>
                            <ul className="pagination pagination-separated justify-content-center justify-content-sm-end mb-0">
                              <li className="page-item disabled">
                                <a href="#" className="page-link">Previous</a>
                              </li>
                              <li className="page-item active">
                                <a href="#" className="page-link">1</a>
                              </li>
                              <li className="page-item">
                                <a href="#" className="page-link">Next</a>
                              </li>
                            </ul>
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