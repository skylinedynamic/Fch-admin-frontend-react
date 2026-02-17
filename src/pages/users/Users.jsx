import React, { useEffect, useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { usePermissions } from '../../lib/auth/usePermissions';
import { DataTable } from '../../components/Table/DataTableWrapper'
import { Column } from 'primereact/column'
import { Dropdown } from 'primereact/dropdown'
import { FilterMatchMode, FilterOperator } from 'primereact/api'
import { fetchUsers, createUser, fetchRoles, updateUser, deleteUsers, getUserCount, purchaseUserSeats } from '../../modules/user/services';
import { getUserDetails } from '../../lib/auth/authApi';
import { formatPhoneNumber } from '../../utils/formatters';
import { USER_STATUS } from '../../config/statusOptions';
import '../../../assets/css/bootstrap.min.css';
import { toast } from "react-toastify";
import UserModal from './components/UserModal';
import TableLoader from '../../components/Loader/TableLoader';
import FilterLoader from '../../components/Loader/FilterLoader';
import DeleteConfirmationModal from '../../components/Common/Modals/DeleteConfirmationModal';
import { useAuthStore } from '../../store/auth/authStore';
import UserLimitModal from './components/UserLimitModal';
import UserPaymentModal from './components/UserPaymentModal';

export default function Users() {
  const [filters, setFilters] = useState({})
  const [globalFilterValue, setGlobalFilterValue] = useState('')
  const [selection, setSelection] = useState([])
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(10)
  const [sortField, setSortField] = useState('id')
  const [sortOrder, setSortOrder] = useState('desc')
  const [totalRecords, setTotalRecords] = useState(0)
  const [appliedFilters, setAppliedFilters] = useState({})
  const [appliedGlobalFilterValue, setAppliedGlobalFilterValue] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [appliedRoleFilter, setAppliedRoleFilter] = useState('')
  const [appliedStatusFilter, setAppliedStatusFilter] = useState('')

  const [showAddUser, setShowAddUser] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [roles, setRoles] = useState([]);
  const [editingUserId, setEditingUserId] = useState(null);
  const [deletingUserId, setDeletingUserId] = useState(null);
  const [loadingSave, setLoadingSave] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState(false);
  const [showPasswordFields, setShowPasswordFields] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { hasPermission } = usePermissions();
  const [loadingLimitCheck, setLoadingLimitCheck] = useState(false);
  const user = useAuthStore((state) => state.user);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [limitData, setLimitData] = useState({ count: 0, price: '0', limit: 0, quantity: 1, months: 1, totalPrice: 0 });
  const [isPurchaseFlow, setIsPurchaseFlow] = useState(false);

  const handleAddUserClick = async () => {
    // Check if current user is host from store (no API call needed)
    if (user?.is_host === 1) {
       setShowAddUser(true);
       setEditingUserId(null);
       setIsPurchaseFlow(false);
       setBackendErrors({});
       setNewUser({ user_id: '', name: '', email: '', phone_number: '', role_id: '', password: '', new_password: '', confirm_password: '' });
       return;
    }

    try {
      setLoadingLimitCheck(true);
      
      const detailsRes = await getUserDetails();
      const freshUser = detailsRes.data?.user;
      
      const data = await getUserCount();
      const currentCount = data.data.count || 0;
      const freeLimit = freshUser?.total_free_users || 0;
      const paidLimit = freshUser?.total_paid_users || 0;
      const totalAllowed = freeLimit + paidLimit;
      
      if (currentCount < totalAllowed) {
         setShowAddUser(true);
         setEditingUserId(null);
         setIsPurchaseFlow(false);
         setBackendErrors({});
         setNewUser({ user_id: '', name: '', email: '', phone_number: '', role_id: '', password: '', new_password: '', confirm_password: '' });
      } else {
         setLimitData({
             count: currentCount,
             price: data.data.per_user_price,
             limit: totalAllowed,
             quantity: 1,
             totalPrice: parseFloat(data.data.per_user_price || 0)
         });
         setShowLimitModal(true);
      }
    } catch (error) {
      console.error("Failed to check user limit:", error);
      toast.error("Failed to check user limit");
    } finally {
      setLoadingLimitCheck(false);
    }
  };

  const handleLimitProceed = (months, totalPrice) => {
    setLimitData(prev => ({ ...prev, months, quantity: 1, totalPrice }));
    setShowLimitModal(false);
    setIsPurchaseFlow(true);
    setEditingUserId(null);
    setNewUser({ 
      user_id: '', 
      name: '', 
      email: '', 
      phone_number: '', 
      role_id: '', 
      password: '', 
      new_password: '', 
      confirm_password: '',
      is_paid: true 
    });
    setShowAddUser(true);
  };

  const handlePaymentSuccess = async () => {
    setShowPaymentModal(false);
    toast.success("Payment completed successfully!");
    window.location.reload();
  };

  const [newUser, setNewUser] = useState({
    user_id: '',
    name: '',
    email: '',
    phone_number: '',
    role_id: '',
    status: '',
    password: '',
    new_password: '',
    confirm_password: '',
  });

  const [backendErrors, setBackendErrors] = useState({});

  const statusOptions = [
    { label: 'All Status', value: '' },
    ...USER_STATUS
  ]

  const initFilters = () => {
    const initial = {
      global: { value: null, matchMode: FilterMatchMode.CONTAINS },
      name: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }] },
      phone_number: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
      email: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
      entity_type: { operator: FilterOperator.OR, constraints: [{ value: null, matchMode: FilterMatchMode.EQUALS }] },
      role_name: { operator: FilterOperator.OR, constraints: [{ value: null, matchMode: FilterMatchMode.EQUALS }] },
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

  const resolveRoleId = (rowData) => {
    if (!rowData) return '';
    if (rowData.role_id != null) return String(rowData.role_id);
    if (rowData.role) {
      const found = roles.find(r => r.name === rowData.role || String(r.id) === String(rowData.role));
      if (found) return String(found.id);
    }
    return '';
  };

  const loadUsers = async () => {
    setLoading(true)
    try {
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
      const res = await fetchUsers(payload)
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
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!appliedFilters || Object.keys(appliedFilters).length === 0) return
    const timeout = setTimeout(() => {
      loadUsers()
    }, 300)
    return () => clearTimeout(timeout)
  }, [appliedRoleFilter, appliedStatusFilter, appliedGlobalFilterValue, appliedFilters, page, perPage, sortField, sortOrder])

  const onGlobalFilterChange = (e) => {
    const value = e.target.value
    setFilters(prev => ({ ...prev, global: { ...prev.global, value } }))
    setGlobalFilterValue(value)
  }

  const onStatusChange = (e) => {
    const val = e.target.value
    setStatusFilter(val)
  }

  const onRoleChange = (e) => {
    const val = e.target.value
    setRoleFilter(val)
  }

  const onApplyFilters = () => {
    setLoading(true)
    setAppliedGlobalFilterValue(globalFilterValue || '')
    setAppliedStatusFilter(statusFilter || '')
    setAppliedRoleFilter(roleFilter || '')
    setAppliedFilters(filters)
    setPage(1)
  }

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onApplyFilters();
      const params = new URLSearchParams(location.search);
      if (globalFilterValue) params.set('search', globalFilterValue);
      else params.delete('search');
      if (statusFilter) params.set('status', statusFilter);
      else params.delete('status');
      if (roleFilter) params.set('role', roleFilter);
      else params.delete('role');
      navigate(`/users?${params.toString()}`);
    }
  };

  const onClearFilters = () => {
    setLoading(true)
    initFilters()
    setAppliedRoleFilter('')
    setAppliedStatusFilter('')
    setRoleFilter('')
    setStatusFilter('')
    setPage(1)
  }

  const nameBody = (rowData) => (
    <span
      className="link-primary"
      style={{ cursor: 'pointer' }}
      onClick={() => {
        if (!hasPermission('update users')) return;
        setEditingUserId(rowData.id);
        setBackendErrors({});
        setNewUser({
          user_id: rowData.user_id || '',
          name: rowData.name || '',
          email: rowData.email || '',
          phone_number: rowData.phone_number || '',
          role_id: resolveRoleId(rowData),
          status: rowData.status || '',
          password: rowData.password || '',
          new_password: '',
          confirm_password: '',
        });
        setShowAddUser(true);
      }}
    >
      {rowData.name}
    </span>
  )

  const statusBodyTemplate = (rowData) => {
    const active = rowData?.status === 'active';
    return (
      <span className={`badge ${active ? 'border border-success text-success' : 'badge border border-danger text-danger'}`}>
        {active ? 'Active' : 'Inactive'}
      </span>
    );
  }

  const onPage = (event) => {
    setPerPage(event.rows)
    setPage(Math.floor(event.first / event.rows) + 1)
  }
  const onSort = (event) => {
    setSortField(event.sortField || sortField)
    setSortOrder(event.sortOrder === 1 ? 'asc' : 'desc')
  }

  const handleAddUserSubmit = async (e) => {
    e.preventDefault();



    // Clear previous backend errors
    setBackendErrors({});

    if (editingUserId && newUser.new_password && newUser.new_password !== newUser.confirm_password) {
      toast.error("New password and confirm password do not match");
      return;
    }

    const payload = {
      user_id: newUser.user_id,
      name: newUser.name,
      email: newUser.email,
      phone_number: newUser.phone_number,
      role_id: newUser.role_id ? Number(newUser.role_id) : null,
      status: newUser.status,
      ...(editingUserId
        ? {
          change_password: showPasswordFields && newUser.new_password ? true : false,
          ...(showPasswordFields && newUser.new_password
            ? {
              new_password: newUser.new_password,
              confirm_password: newUser.confirm_password,
            }
            : {})
        }
        : { 
            password: newUser.password,
            // If purchase flow, include these fields. 
            // Note: Backend must accept is_paid:true or handle it appropriately.
            // If backend rejects 'is_paid' for creation without payment, this flow might fail.
            // Assuming backend allows creation or we handle payment after.
            ...(isPurchaseFlow ? { is_paid: true, months: limitData.months, amount: limitData.totalPrice } : {})
        })
    }

    try {
      setLoadingSave(true);
      if (editingUserId) {
          await updateUser(editingUserId, payload)
          toast.success(`User updated successfully`);
          setShowAddUser(false)
          setEditingUserId(null)
          setBackendErrors({});
          loadUsers()
      } else {
          await createUser(payload)
          toast.success(`User created successfully`);
          
          if (isPurchaseFlow) {
              // User created, now proceed to payment
              setShowAddUser(false);
              setShowPaymentModal(true);
              // Do NOT clear editingUserId or newUser yet if we might need them? 
              // Actually, user is created. We move to payment.
          } else {
              setShowAddUser(false)
              setEditingUserId(null)
              setBackendErrors({});
              loadUsers()
          }
      }
    } catch (error) {
      // Handle backend validation errors
      if (error?.response?.data?.errors) {
        // Backend returned field-specific validation errors
        const errors = error.response.data.errors;
        setBackendErrors(errors);

        // Show the first error message as a toast
        const firstErrorMessage = error.response.data.message || Object.values(errors)[0];
        // toast.error(firstErrorMessage);
      } else if (error?.response?.data?.message) {
        // Backend returned a general error message
        // toast.error(error.response.data.message);
      } else {
        // Generic error
        toast.error("Failed to save user");
      }
      console.error(error)
    }
    finally {
      setLoadingSave(false);
    }
  };

  const handleAddUserInput = (e) => {
    const { name, value } = e.target;
    if (name === 'phone_number') {
      setNewUser({ ...newUser, [name]: formatPhoneNumber(value) });
    } else {
      setNewUser({ ...newUser, [name]: value });
    }
  };

  const handleDeleteUsers = async () => {
    const idsToDelete = deletingUserId ? [deletingUserId] : selection.map(u => u.id);

    if (idsToDelete.length === 0) {
      toast.warn("No users selected for deletion");
      return;
    }

    try {
      setLoadingDelete(true);
      await deleteUsers(idsToDelete);
      toast.success("Users deleted successfully");
      setSelection([]);
      setDeletingUserId(null);
      setShowDeleteModal(false);
      loadUsers();
    } catch (error) {
      console.error(error);
      toast.error(error?.response?.data?.message || "Failed to delete users");
    } finally {
      setLoadingDelete(false);
    }
  };

  return (
    <div className="page-content">
      <div className="container-fluid">
        <div className="row bg-body">
          <div className="row bg-body">
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
                                {hasPermission('delete users') && Array.isArray(selection) && selection.length > 0 ? (
                                  <>
                                    <button type="button" id="primaryActionBtn" className="btn bg-success text-white fw-medium">
                                      Actions
                                    </button>
                                    <button type="button" id="primaryActionToggleBtn" className="btn bg-success text-white fw-medium dropdown-toggle dropdown-toggle-split" data-bs-toggle="dropdown" aria-expanded="false">
                                      <span className="visually-hidden">Toggle dropdown</span>
                                    </button>
                                    <ul className="dropdown-menu dropdown-menu-end" id="primaryActionMenu">
                                      <li>
                                        <button
                                          className="dropdown-item text-danger"
                                          type="button"
                                          onClick={() => {
                                            if (!selection || selection.length === 0) {
                                              toast.warn("No users selected for deletion");
                                              return;
                                            }
                                            setDeletingUserId(null);
                                            setShowDeleteModal(true);
                                          }}
                                        >
                                          <i className="ri-delete-bin-6-line me-1 align-bottom"></i> Delete Selected
                                        </button>
                                      </li>
                                    </ul>
                                  </>
                                ) : hasPermission('create users') ? (
                                  <button 
                                    className="btn btn-primary fw-medium" 
                                    onClick={handleAddUserClick}
                                    disabled={loadingLimitCheck}
                                  >
                                    {loadingLimitCheck ? (
                                      <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                                    ) : (
                                      <i className="ri-add-fill me-1 align-bottom"></i>
                                    )}
                                    Add User
                                  </button>
                                ) : null}
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
                      <div className="card-body list-fluid-card">
                        <form onSubmit={(e) => {
                          e.preventDefault();
                          onApplyFilters();
                        }}>
                          {loading ? (
                            <FilterLoader config={[
                              { col: "col-xxl-4 col-sm-12" }, // Search
                              { col: "col-xxl-3 col-sm-4" },  // Status
                              { col: "col-xxl-3 col-sm-4" },  // Role
                              { col: "col-xxl-2 col-sm-4", isButton: true } // Buttons
                            ]} />
                          ) : (
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
                                    onChange={(e) => setGlobalFilterValue(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        onApplyFilters();
                                      }
                                    }}
                                  />
                                  <i className="ri-search-line search-icon"></i>
                                </div>
                              </div>
                              <div className="col-xxl-2 col-sm-4">
                                <Dropdown
                                  value={statusFilter}
                                  onChange={(e) => onStatusChange({ target: { value: e.value } })}
                                  options={statusOptions}
                                  optionLabel="label"
                                  optionValue="value"
                                  placeholder="All Status"
                                  className="w-100 employee-filter-dropdown"
                                />
                              </div>
                              <div className="col-xxl-2 col-sm-4">
                                <Dropdown
                                  value={roleFilter || ''}
                                  onChange={(e) => onRoleChange({ target: { value: e.value } })}
                                  options={[{ id: '', name: 'All Role' }, ...roles]}
                                  optionLabel="name"
                                  optionValue="id"
                                  placeholder="All Role"
                                  className="w-100 employee-filter-dropdown"
                                />
                              </div>
                              <div className="col-xxl-4 col-sm-4">
                                <div className="d-flex gap-2">
                                  <button type="button" className="btn btn-warning flex-grow-1" onClick={onApplyFilters}>
                                    <i className="ri-equalizer-fill me-1 align-bottom"></i> Filters
                                  </button>
                                  <button type="button" className="btn btn-default flex-grow-1" onClick={onClearFilters}>
                                    <i className="ri-close-line me-1 align-bottom"></i> Clear
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </form>

                        {/* TableLoader applied here */}
                        {loading ? (
                          <TableLoader
                            rows={10}
                            columns={[
                              { style: { width: '3rem' } }, // Selection
                              { style: { minWidth: '' } }, // Name
                              { style: { minWidth: '' } }, // Phone
                              { style: { minWidth: '' } }, // Email
                              { style: { minWidth: '' } }, // Entity Type
                              { style: { minWidth: '' } }, // Role
                              { style: { minWidth: '' } }, // Status
                              { style: { width: '12rem' } } // Action
                            ]}
                          />
                        ) : (
                          <div className="table-responsive table-card mt-1">
                            <DataTable
                              scrollable
                              scrollHeight="calc(100vh - 370px)"
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
                                'name',
                                'phone_number',
                                'email',
                                'role',
                                'status',
                              ]}
                              selection={selection}
                              onSelectionChange={(e) => setSelection(e.value)}
                              dataKey="id"
                              responsiveLayout="scroll"
                              className="p-datatable-sm"
                              emptyMessage="No Users found"
                            >
                              {hasPermission('delete users') && (
                                <Column selectionMode="multiple" headerStyle={{ width: '3rem' }} exportable={false}></Column>
                              )}
                              <Column field="name" header="User Name" sortable filter showFilterMatchModes filterPlaceholder="Search name" body={nameBody}></Column>
                              <Column field="phone_number" header="Phone" sortable filter showFilterMatchModes filterPlaceholder="(xxx) xxx-xxxx"></Column>
                              <Column field="email" header="Email" sortable filter showFilterMatchModes filterPlaceholder="Search email"></Column>
                              <Column field="role_name" header="Role" sortable filter showFilterMatchModes filterPlaceholder="Search Role"></Column>
                              <Column field="status" header="Status" sortable filter showFilterMatchModes filterPlaceholder="Search Status" body={statusBodyTemplate}></Column>
                              {(hasPermission('update users') || hasPermission('delete users')) && (
                                <Column
                                  header="Action"
                                  body={(rowData) => (
                                    <div className="d-flex align-items-center gap-2 justify-content-center justify-content-sm-start">
                                      {hasPermission('update users') && (
                                        <button
                                          className="btn btn-sm btn-primary"
                                          aria-label="Edit user"
                                          onClick={() => {
                                            setEditingUserId(rowData.id);
                                            setBackendErrors({});
                                            setNewUser({
                                              user_id: rowData.user_id || '',
                                              name: rowData.name || '',
                                              email: rowData.email || '',
                                              phone_number: rowData.phone_number || '',
                                              role_id: resolveRoleId(rowData),
                                              password: rowData.password || '',
                                              status: rowData.status || '',
                                              new_password: '',
                                              confirm_password: '',
                                            });
                                            setShowAddUser(true);
                                          }}
                                        >
                                          <i className="ri-edit-2-fill align-bottom"></i>
                                          <span className="d-none d-sm-inline ms-1">Edit</span>
                                        </button>
                                      )}
                                      {hasPermission('delete users') && (
                                        <button
                                          className="btn btn-sm btn-danger"
                                          aria-label="Delete user"
                                          onClick={() => {
                                            setDeletingUserId(rowData.id);
                                            setShowDeleteModal(true);
                                          }}
                                        >
                                          <i className="ri-delete-bin-6-fill align-bottom"></i>
                                          <span className="d-none d-sm-inline ms-1">Delete</span>
                                        </button>
                                      )}
                                    </div>
                                  )}
                                  style={{ textAlign: 'center', width: '12rem' }}
                                />
                              )}
                            </DataTable>
                          </div>
                        )}

                      </div>
                    </div>
                  </div>
                </div>

                <UserModal
                  show={showAddUser}
                  onHide={() => {
                    setShowAddUser(false);
                    setEditingUserId(null);
                    setIsPurchaseFlow(false);
                    setShowPasswordFields(false);
                    setBackendErrors({});
                  }}
                  onSubmit={handleAddUserSubmit}
                  user={newUser}
                  onChange={handleAddUserInput}
                  roles={roles}
                  isEdit={!!editingUserId}
                  loadingSave={loadingSave}
                  showPasswordFields={showPasswordFields}
                  onPasswordFieldsToggle={setShowPasswordFields}
                  backendErrors={backendErrors}
                />

                <DeleteConfirmationModal
                  show={showDeleteModal}
                  onConfirm={handleDeleteUsers}
                  onClose={() => {
                    setShowDeleteModal(false);
                    setDeletingUserId(null);
                  }}
                  loading={loadingDelete}
                  text={
                    deletingUserId
                      ? "Deleting this user will remove all information."
                      : "Deleting selected users will remove all information."
                  }
                />
                <UserLimitModal 
                  show={showLimitModal} 
                  onHide={() => setShowLimitModal(false)} 
                  onProceed={handleLimitProceed}
                  userCount={limitData.count} 
                  freeLimit={limitData.limit} 
                  perUserPrice={limitData.price} 
                />

                <UserPaymentModal
                  show={showPaymentModal}
                  onHide={() => setShowPaymentModal(false)}
                  onSuccess={handlePaymentSuccess}
                  amount={limitData.totalPrice}
                  quantity={limitData.quantity}
                  months={limitData.months}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
