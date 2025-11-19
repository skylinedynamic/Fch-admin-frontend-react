import React, { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../../lib/http/apiClient'
import newDocImg from '../../../assets/images/new-document.png'
import RolesGridLoader from '../../components/Loader/RolesGridLoader'
import ErrorState from '../../components/Loader/ErrorState'

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

  const usersByRole: Record<string, User[]> = useMemo(() => ({
    Admin: [
      { id: 1, name: 'Admin', email: 'admin@mail.com', role: 'Admin', joined: '10 Jul 2025, 04:24 am' },
      { id: 2, name: 'Alex Carter', email: 'alex@example.com', role: 'Admin', joined: '12 Aug 2025, 01:10 pm' }
    ]
  }), [])

  const initials = (s: string) => (s || '?').trim().charAt(0).toUpperCase()

  const handleViewUsers = (role: Role) => {
    setSelectedRole(role)
    setShowAllPerms(false)
    setModalOpen(true)
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
                          <button className="btn btn-primary">Edit Role</button>
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
                    <div className="modal d-block users-modal" tabIndex={-1} role="dialog" aria-modal="true">
                      <div className="modal-dialog modal-lg" style={{ maxWidth: '980px' }}>
                        <div className="modal-content border-0" style={{ boxShadow: '0 12px 28px rgba(16,24,40,.18)' }}>
                          <div className="modal-header">
                            <h5 className="modal-title d-flex align-items-center gap-2">
                              <i className="ri-user-3-line fs-18"></i> {selectedRole.name} Users Assigned <span className="badge-count">({(usersByRole[selectedRole.name]||[]).length})</span>
                            </h5>
                            <button type="button" className="btn-close" onClick={() => setModalOpen(false)} aria-label="Close"></button>
                          </div>
                          <div className="modal-body p-4">
                            <div className="row g-4">
                              <div className="col-lg-4">
                                <div className="card" style={{ borderRadius: '12px' }}>
                                  <div className="card-body position-relative">
                                    <span className="badge bg-warning-subtle text-warning position-absolute" style={{ right: 16, top: 16 }}>Details</span>
                                    <h6 className="section-title mb-3">{selectedRole.name}</h6>
                                    <ul className="bullet-list mb-3">
                                      {previewPermissions(selectedRole.permissions).map((p, i) => (<li key={p + i}>{p}</li>))}
                                      {remainingCount(selectedRole.permissions) > 0 && !showAllPerms && (
                                        <li><button className="btn btn-link p-0 text-muted" onClick={() => setShowAllPerms(true)}>and {remainingCount(selectedRole.permissions)} more...</button></li>
                                      )}
                                    </ul>
                                    {showAllPerms && (
                                      <div className="permissions-scroll mt-2">
                                        <div className="d-flex align-items-center justify-content-between mb-2">
                                          <h6 className="section-title mb-0">All Permissions</h6>
                                        </div>
                                        <ul className="bullet-list mb-0">
                                          {selectedRole.permissions.map((p, i) => (<li key={p + i}>{p}</li>))}
                                        </ul>
                                        <div className="mt-2 text-end">
                                          <button className="btn btn-link p-0 text-primary" onClick={() => setShowAllPerms(false)}>Show less</button>
                                        </div>
                                      </div>
                                    )}
                                    <button className="btn btn-primary w-100 mt-3">Edit Role</button>
                                  </div>
                                </div>
                              </div>
                              <div className="col-lg-8">
                                <div className="card" style={{ borderRadius: '12px' }}>
                                  <div className="card-body">
                                    <table className="user-table w-100">
                                      <thead>
                                        <tr>
                                          <th>ID</th>
                                          <th>User</th>
                                          <th>Name</th>
                                          <th>Joined Date</th>
                                          <th>Action</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {(usersByRole[selectedRole.name] || []).map(u => (
                                          <tr key={u.id}>
                                            <td>{u.id}</td>
                                            <td>
                                              <span className="avatar-dot">{initials(u.name)}</span>
                                            </td>
                                            <td>
                                              <div className="user-identity" style={{ gap: 4 }}>
                                                <div>
                                                  <div className="name">{u.name}</div>
                                                  <div className="email">{u.email}</div>
                                                </div>
                                              </div>
                                            </td>
                                            <td>{u.joined}</td>
                                            <td className="table-actions">
                                              <button className="btn btn-sm btn-outline-primary">View</button>
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              </div>
                            </div>
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