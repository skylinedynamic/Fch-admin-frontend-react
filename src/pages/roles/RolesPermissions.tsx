import React, { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../../lib/http/apiClient'
import newDocImg from '../../../assets/images/new-document.png'
import RolesGridLoader from '../../components/Loader/RolesGridLoader'
import ErrorState from '../../components/Loader/ErrorState'
import { fetchRoleDetail } from '../../modules/role/services'
import type { RoleDetail, RoleDetailUser } from '../../modules/role/types'

type User = { id: number; name: string; email: string; role: string; joined: string }
type ApiRole = { id: number; name: string; permissions: string[]; users_count?: number }
type Role = { id?: number; name: string; usersCount: number; permissions: string[] }

export default function RolesPermissions() {
  const navigate = useNavigate()
  const { data: apiRoles, isLoading, isError } = useQuery<ApiRole[]>({
    queryKey: ['roles'],
    queryFn: async () => {
      const res = await apiClient.get('/common/roles')
      const payload = res?.data
      const list = Array.isArray(payload) ? payload : (payload?.data ?? payload?.roles ?? [])
      return Array.isArray(list) ? list as ApiRole[] : []
    },
    staleTime: 60_000,
  })

  const roles: Role[] = useMemo(() => {
    return (apiRoles || []).map(r => ({
      id: r.id,
      name: r.name,
      permissions: Array.isArray(r.permissions) ? r.permissions : [],
      usersCount: Number(r.users_count ?? 0),
    }))
  }, [apiRoles])
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [showAllPerms, setShowAllPerms] = useState(false)
  const [roleDetail, setRoleDetail] = useState<RoleDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)

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


  return (
    <div id="roles-permissions-page" className="page-content">
      <div className="container-fluid">
        <div className="row mb-3 pb-1 page-subheader-sticky bg-body">
          <div className="col-12">
            <div className="d-flex align-items-center justify-content-between flex-row">
              <div className="flex-grow-1">
                <h4 className="fs-20 mb-1">Roles &amp; Permissions</h4>
                <nav aria-label="breadcrumb" className="d-none d-sm-block">
                  <ol className="breadcrumb m-0">
                    <li className="breadcrumb-item"><Link to="/">Dashboard</Link></li>
                    <li className="breadcrumb-item active" aria-current="page">Roles &amp; Permissions</li>
                  </ol>
                </nav>
              </div>
              <div className="mt-0">
                <Link to="/roles-permissions/create" className="btn btn-primary fw-medium">
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
                      <div className="role-summary-card" key={r.name + idx}>
                        <div className="role-header"><h5>{r.name}</h5><span className="count-badge solid">{r.usersCount} users</span></div>
                        <p className="role-meta mb-2">Total users with this role: <strong>{r.usersCount}</strong></p>
                        <ul className="bullet-list">
                          {previewPermissions(r.permissions).map((p, i) => (<li key={p + i}>{p}</li>))}
                          {remainingCount(r.permissions) > 0 && (
                            <li className="text-muted">and {remainingCount(r.permissions)} more...</li>
                          )}
                        </ul>
                        <div className="card-actions">
                          <button className="btn btn-light" onClick={() => handleViewUsers(r)}>View All Users</button>
                          <button className="btn btn-primary" onClick={() => r.id && navigate(`/roles-permissions/edit/${r.id}`)} disabled={!r.id}>Edit Role</button>
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
                      <div className="modal-dialog modal-lg users-modal-dialog">
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
                                    <span className="badge bg-warning-subtle text-warning position-absolute detail-badge">Details</span>
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
                                  <div className="card-body">
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
    </div>
  )
}