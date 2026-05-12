import React, { useMemo, useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useRoles, useDeleteRole } from '../../modules/role/queries'
import newDocImg from '../../../assets/images/new-document.png'
import RolesGridLoader from '../../components/Loader/RolesGridLoader'
import ErrorState from '../../components/Loader/ErrorState'
import { fetchRoleDetail } from '../../modules/role/services'
import type { RoleDetail, RoleDetailUser, Role } from '../../modules/role/types'
import { toast } from 'react-toastify'
// @ts-ignore
import DeleteConfirmationModal from '../../components/Common/Modals/DeleteConfirmationModal.jsx'

type User = { id: number; name: string; email: string; role: string; joined: string }

export default function RolesPermissions() {
  const navigate = useNavigate()
  const { data: apiRoles, isLoading, isError, refetch } = useRoles()

  const roles: Role[] = useMemo(() => (apiRoles || []), [apiRoles])
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [showAllPerms, setShowAllPerms] = useState(false)
  const [roleDetail, setRoleDetail] = useState<RoleDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)
  const { mutateAsync: deleteRoleMutate, isPending: deletingRole } = useDeleteRole()
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null)

  // Users will be pulled from API response (roleDetail.users)

  const initials = (s: string) => (s || '?').trim().charAt(0).toUpperCase()

  const handleViewUsers = async (role: Role) => {
    setSelectedRole(role)
    setShowAllPerms(false)
    setDetailError(null)
    setRoleDetail(null)
    setModalOpen(true)
    if (!role.id && typeof role.name !== 'undefined') return
    try {
      setDetailLoading(true)
      const detail = await fetchRoleDetail(role.id as number)
      setRoleDetail(detail)
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to fetch role details.'
      setDetailError(String(msg))
    } finally {
      setDetailLoading(false)
    }
  }

  // Add-role interactions are handled via dedicated page; this grid always shows the "Add New Role" card

  const previewPermissions = (perms: string[]) => perms.slice(0, 6)
  const remainingCount = (perms: string[]) => Math.max(perms.length - 6, 0)

  const handleDeleteRole = async (role: Role): Promise<boolean> => {
    if (!role.id) return false
    try {
      const res: any = await deleteRoleMutate(role.id)
      if (res && typeof res === 'object') {
        if (res.status === true) {
          toast.success(String(res.message ?? 'Role deleted successfully.'))
          refetch()
          return true
        }
        if (res.status === false) {
          const msg = res.message
          const errors = res.errors
          if (errors && typeof errors === 'object') {
            const firstKey = Object.keys(errors)[0]
            const firstMsg = firstKey ? (errors as any)[firstKey] : msg
            toast.error(String(firstMsg ?? msg ?? 'Validation failed.'))
          } else {
            toast.error(String(msg ?? 'Operation failed.'))
          }
          return false
        }
      }
      toast.success('Role deleted successfully.')
      refetch()
      return true
    } catch (err: any) {
      const data = err?.response?.data
      const msg = data?.message
      const errors = data?.errors
      if (errors && typeof errors === 'object') {
        const firstKey = Object.keys(errors)[0]
        const firstMsg = firstKey ? (errors as any)[firstKey] : msg
        toast.error(String(firstMsg ?? msg ?? 'Validation failed.'))
      } else if (typeof msg === 'string') {
        toast.error(String(msg))
      } else {
        toast.error('Failed to delete role.')
      }
      return false
    }
  }

  const openDeleteModal = (role: Role) => {
    setRoleToDelete(role)
    setDeleteModalOpen(true)
  }

  const closeDeleteModal = () => {
    if (!deletingRole) {
      setDeleteModalOpen(false)
      setRoleToDelete(null)
    }
  }

  const confirmDelete = async () => {
    if (!roleToDelete) return
    const ok = await handleDeleteRole(roleToDelete)
    if (ok) {
      setDeleteModalOpen(false)
      setRoleToDelete(null)
    }
  }


  return (
    <div id="roles-permissions-page" className="page-content">
      <div className="container-fluid">
        <div className="row pb-1 page-subheader-sticky bg-body">
          <div className="col-12">
            <div className="d-flex align-items-lg-center flex-lg-row flex-column py-2">
              <div className="flex-grow-1">
                <h4 className="fs-20 mb-1">Roles &amp; Permissions</h4>
                <nav aria-label="breadcrumb" className="d-block">
                  <ol className="breadcrumb m-0">
                    <li className="breadcrumb-item"><Link to="/">Dashboard</Link></li>
                    <li className="breadcrumb-item active" aria-current="page">Roles &amp; Permissions</li>
                  </ol>
                </nav>
              </div>
              <div className="page-actions d-flex align-items-center gap-2 mt-3 mt-lg-0">
                <Link to="/roles-permissions/create" className="btn btn-primary fw-medium w-100 w-lg-auto">
                  <i className="ri-add-fill me-1 align-bottom"></i> Add Role
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="row">
          <div className="col-xxl-12">
            <div className="card">
              <div className="card-body fluid-card">

                {isLoading ? (
                  <RolesGridLoader />
                ) : isError ? (
                  <ErrorState message="Failed to load roles. Please try again." />
                ) : (
                  <div className="roles-grid">
                    {roles.map((r, idx) => (
                      <div className="role-summary-card" key={(r.id ?? r.name) + String(idx)} style={{ position: 'relative' }}>
                        <div className="role-header"><h5>{r.name}</h5><span className="count-badge solid text-white">{Number(r.users_count ?? 0)} users</span></div>
                        {r.description && <p className="text-muted fs-14 mb-0 role-desc" title={r.description}>{r.description}</p>}
                        <ul className="bullet-list">
                          {r.permissions.length === 0 ? (
                            <li className="text-muted fst-italic">No permissions assigned to this role</li>
                          ) : (
                            <>
                              {previewPermissions(r.permissions).map((p, i) => (<li key={p + i}>{p}</li>))}
                              {remainingCount(r.permissions) > 0 && (
                                <li className="text-muted">and {remainingCount(r.permissions)} more...</li>
                              )}
                            </>
                          )}
                        </ul>
                        <div className="card-actions d-flex align-items-center">
                          <button className="btn btn-light" onClick={() => handleViewUsers(r)}>
                            <span className="label-full">View All Users</span>
                            <span className="label-short">Users</span>
                          </button>
                          <button className="btn btn-primary ms-2" onClick={() => r.id && navigate(`/roles-permissions/edit/${r.id}`)} disabled={!r.id}>Edit Role</button>
                          {!r.is_static && (
                            <button
                              className="btn btn-outline-danger ms-auto"
                              onClick={() => openDeleteModal(r)}
                              disabled={deletingRole}
                            >
                              <i className="ri-delete-bin-6-line align-bottom"></i>
                            </button>
                          )}
                        </div>
                      </div>
                    ))}

                    <div className="add-role-card text-center">
                      <img src={newDocImg} alt="Add role" />
                      <h6 className="mb-1">Add New Role</h6>
                      <p className="text-muted mb-3">Create a role and assign permissions.</p>
                      <Link to="/roles-permissions/create" className="btn btn-outline-primary"><i className="ri-add-line me-1"></i> New Role</Link>
                    </div>
                  </div>
                )}

                {modalOpen && selectedRole && (
                  <>
                    <div className="modal-backdrop-custom" onClick={() => setModalOpen(false)}></div>
                    <div className="modal d-block users-modal" tabIndex={-1} role="dialog" aria-modal="true" onClick={(e) => { if (e.target === e.currentTarget) setModalOpen(false) }}>
                      <div className="modal-dialog modal-xl users-modal-dialog">
                        <div className="modal-content border-0 enhanced-shadow">
                          <div className="modal-header">
                            <h5 className="modal-title d-flex align-items-center gap-2">
                              <i className="ri-user-3-line fs-18"></i> {roleDetail?.name || selectedRole.name} Users Assigned <span className="badge-count">({(roleDetail?.users || []).length})</span>
                            </h5>
                            <button type="button" className="btn-close" onClick={() => setModalOpen(false)} aria-label="Close"></button>
                          </div>
                          <div className="modal-body p-4">
                            {detailLoading ? (
                              <div className="d-flex justify-content-center align-items-center modal-loading">
                                <span className="spinner-border" aria-hidden="true"></span>
                                <span className="ms-2">Loading role details...</span>
                              </div>
                            ) : detailError ? (
                              <ErrorState message={detailError} />
                            ) : (
                              <div className="row g-4">
                                <div className="col-lg-4">
                                  <div className="card">
                                    <div className="card-body position-relative">
                                      <h6 className="section-title mb-3">{roleDetail?.name || selectedRole.name}</h6>
                                      <div className="permissions-scroll mt-2">
                                        <div className="d-flex align-items-center justify-content-between mb-2">
                                          <h6 className="section-title mb-0">All Permissions</h6>
                                        </div>
                                        <ul className="bullet-list mb-0">
                                          {(roleDetail?.permission || []).map((p, i) => (<li key={p + i}>{p}</li>))}
                                        </ul>
                                      </div>

                                    </div>
                                  </div>
                                </div>
                                <div className="col-lg-8">
                                  <div className="card">
                                    <div className="card-body permissions-user-scroll">
                                      <div className="user-table-wrapper">
                                        <table className="user-table w-100">
                                          <thead>
                                            <tr>
                                              <th>ID</th>
                                              <th>User</th>
                                              <th>Name</th>
                                              <th>Email</th>
                                              <th>Phone</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {(roleDetail?.users || []).length === 0 ? (
                                              <tr className="empty-row">
                                                <td colSpan={5}>No users found assigned to this role.</td>
                                              </tr>
                                            ) : (
                                              (roleDetail?.users || []).map((u: RoleDetailUser) => (
                                                <tr key={u.id}>
                                                  <td>{u.id}</td>
                                                  <td>
                                                    {u.image ? (
                                                      <img src={u.image} alt={u.name} className="user-avatar" />
                                                    ) : (
                                                      <span className="avatar-dot">{initials(u.name)}</span>
                                                    )}
                                                  </td>
                                                  <td>
                                                    <div className="user-identity compact">
                                                      <div>
                                                        <div className="name">{u.name}</div>
                                                      </div>
                                                    </div>
                                                  </td>
                                                  <td>{u.email}</td>
                                                  <td>{u.phone_number}</td>
                                                </tr>
                                              ))
                                            )}
                                          </tbody>
                                        </table>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}

              </div>
            </div>
          </div>
        </div>

      </div>
      <DeleteConfirmationModal
        show={deleteModalOpen}
        onConfirm={confirmDelete}
        onClose={closeDeleteModal}
        loading={deletingRole}
      />
    </div>
  )
}
