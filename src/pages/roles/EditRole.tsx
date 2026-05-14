import React, { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useGroupedPermissions, useUpdateRole } from '../../modules/role/queries'
import type { ApiModulePermissions } from '../../modules/role/types'
import PermissionCardsLoader from '../../components/Loader/PermissionCardsLoader'
import ErrorState from '../../components/Loader/ErrorState'
import { toast } from 'react-toastify'
import { fetchRoleDetail } from '../../modules/role/services'

type PermissionItem = { id?: number; key: string; label: string; icon: string }
type ModuleDef = { key: string; name: string; icon: string; desc: string; permissions: PermissionItem[] }

const toKey = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
const titleCase = (text: string) => text.replace(/(^|\s)\w/g, (m) => m.toUpperCase())
const permIconByVerb: Record<string, string> = {
  view: 'ri-eye-line',
  create: 'ri-add-line',
  update: 'ri-edit-line',
  delete: 'ri-delete-bin-line',
}

const mapApiModuleToDef = (m: ApiModulePermissions): ModuleDef => {
  const key = toKey(m.module)
  const name = titleCase(m.module)
  const icon = ''
  const desc = `Manage ${name}`
  const permissions: PermissionItem[] = (m.permissions || []).map((p) => {
    const verb = (p.name.split(' ')[0] || '').toLowerCase()
    return {
      id: p.id,
      key: toKey(p.name),
      label: titleCase(p.name),
      icon: permIconByVerb[verb] || 'ri-checkbox-line',
    }
  })
  return { key, name, icon, desc, permissions }
}

// Parse permission like "View Users" -> { modKey: 'users', permKey: 'view' }
const parsePermissionText = (text: string) => {
  const parts = (text || '').trim().split(' ')
  const verb = (parts[0] || '').toLowerCase()
  const moduleName = parts.slice(1).join(' ').trim()
  const modKey = toKey(moduleName)
  const permKey = toKey(text)
  return { modKey, permKey, label: titleCase(text) }
}

export default function EditRole() {
  const navigate = useNavigate()
  const { id } = useParams()
  const roleId = id as string

  const [modules, setModules] = useState<ModuleDef[]>([])
  const [roleName, setRoleName] = useState('')
  const [description, setDescription] = useState('')
  const [adminAccess, setAdminAccess] = useState(false)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [selected, setSelected] = useState<Record<string, Record<string, boolean>>>({})
  const [errors, setErrors] = useState<{ name?: string; description?: string; permission_ids?: string }>({})
  const [detailError, setDetailError] = useState<string | null>(null)
  const [detail, setDetail] = useState<{ id: number | string; name: string; description?: string; permission: string[]; permission_ids?: number[] } | null>(null)
  const hasFetchedDetailRef = React.useRef<boolean>(false)

  const { data: groupedPerms, isLoading: permsLoading, isError: permsError } = useGroupedPermissions({ fresh: true })
  const { mutateAsync: updateRole, isPending: updating } = useUpdateRole()

  // Map API permissions to UI modules
  useEffect(() => {
    if (!groupedPerms || !Array.isArray(groupedPerms)) return
    const mapped = groupedPerms.map(mapApiModuleToDef)
    setModules(mapped)
    setExpanded(Object.fromEntries(mapped.map((m) => [m.key, true])))
  }, [groupedPerms])

  // Fetch role detail AFTER permissions request settles, once
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      if (!roleId) return
      // Wait until permissions request is finished (success or error)
      if (permsLoading) return
      // Guard against React.StrictMode double-invocation and avoid multiple fetches
      if (hasFetchedDetailRef.current) return
      hasFetchedDetailRef.current = true
      try {
        setDetailError(null)
        const d = await fetchRoleDetail(roleId)
        if (cancelled) return
        setDetail(d)
        setRoleName(d.name || '')
        setDescription(d.description || '')
      } catch (err: any) {
        setDetailError(err?.response?.data?.message || 'Failed to load role details.')
      }
    }
    load()
    return () => { cancelled = true }
  }, [roleId, permsLoading])

  // Once modules and detail are ready, build selection without re-calling the detail API
  useEffect(() => {
    if (!detail || !modules.length) return
    const nextSel: Record<string, Record<string, boolean>> = {}

    // Prefer selecting by permission IDs if provided by role detail
    if (Array.isArray(detail.permission_ids) && detail.permission_ids.length) {
      const idSet = new Set<number>(detail.permission_ids)
      modules.forEach((m) => {
        m.permissions.forEach((p) => {
          if (typeof p.id === 'number' && idSet.has(p.id)) {
            nextSel[m.key] = nextSel[m.key] || {}
            nextSel[m.key][p.key] = true
          }
        })
      })
    } else {
      // Fallback: match by normalized permission text (verb + module label)
      detail.permission.forEach((permText) => {
        const normalizedTextKey = toKey(permText)
        const { modKey, permKey } = parsePermissionText(permText)
        const mod = modules.find((m) => m.key === modKey)
        if (mod) {
          const pInMod = mod.permissions.find((pp) => toKey(pp.label) === normalizedTextKey || pp.key === permKey)
          if (pInMod) {
            nextSel[modKey] = nextSel[modKey] || {}
            nextSel[modKey][pInMod.key] = true
            return
          }
        }
        for (const m of modules) {
          const p = m.permissions.find((pp) => toKey(pp.label) === normalizedTextKey)
          if (p) {
            nextSel[m.key] = nextSel[m.key] || {}
            nextSel[m.key][p.key] = true
            break
          }
        }
      })
    }

    setSelected(nextSel)
    const allSelected = modules.every((m) => m.permissions.every((p) => nextSel[m.key]?.[p.key]))
    setAdminAccess(allSelected)
  }, [detail, modules])

  const toggleExpand = (key: string) => {
    setExpanded((e) => ({ ...e, [key]: !e[key] }))
  }

  const toggleModuleAll = (mod: ModuleDef, checked: boolean) => {
    setSelected((sel) => {
      const next = {
        ...sel,
        [mod.key]: mod.permissions.reduce<Record<string, boolean>>((acc, p) => {
          acc[p.key] = checked
          return acc
        }, {})
      }
      const allSelected = modules.every((m) => m.permissions.every((p) => next[m.key]?.[p.key]))
      setAdminAccess(allSelected)
      return next
    })
  }

  const togglePerm = (mod: ModuleDef, permKey: string, checked: boolean) => {
    setSelected((sel) => {
      const next = {
        ...sel,
        [mod.key]: { ...(sel[mod.key] || {}), [permKey]: checked }
      }
      const allSelected = modules.every((m) => m.permissions.every((p) => next[m.key]?.[p.key]))
      setAdminAccess(allSelected)
      return next
    })
  }

  const isModuleAllChecked = (mod: ModuleDef) => {
    const s = selected[mod.key] || {}
    return mod.permissions.every((p) => s[p.key])
  }

  const toggleAllPermissions = (checked: boolean) => {
    const allSelected: Record<string, Record<string, boolean>> = {}
    modules.forEach((mod) => {
      allSelected[mod.key] = mod.permissions.reduce<Record<string, boolean>>((acc, p) => {
        acc[p.key] = checked
        return acc
      }, {})
    })
    setSelected(allSelected)
  }

  const permissionIds = useMemo(() => {
    const ids: number[] = []
    if (adminAccess) {
      modules.forEach((mod) => {
        mod.permissions.forEach((p) => {
          if (typeof p.id === 'number') ids.push(p.id)
        })
      })
    } else {
      modules.forEach((mod) => {
        mod.permissions.forEach((p) => {
          if (selected[mod.key]?.[p.key] && typeof p.id === 'number') {
            ids.push(p.id)
          }
        })
      })
    }
    return ids
  }, [modules, selected, adminAccess])

  const handleSave = async () => {
    const name = roleName.trim()
    setErrors({})
    if (!name) return
    try {
      const res = await updateRole({ id: roleId, payload: { name, description, permission_ids: permissionIds } })
      const msg = (res as any)?.message || 'Role updated successfully.'
      toast.success(msg)
      navigate('/roles-permissions')
    } catch (err: any) {
      const data = err?.response?.data
      const serverErrors = data?.errors || {}
      const nextErrors: { name?: string; description?: string; permission_ids?: string } = {}
      if (serverErrors.name) {
        nextErrors.name = Array.isArray(serverErrors.name) ? serverErrors.name[0] : String(serverErrors.name)
      }
      if (serverErrors.description) {
        nextErrors.description = Array.isArray(serverErrors.description) ? serverErrors.description[0] : String(serverErrors.description)
      }
      if (serverErrors.permission_ids) {
        nextErrors.permission_ids = Array.isArray(serverErrors.permission_ids) ? serverErrors.permission_ids[0] : String(serverErrors.permission_ids)
      }
      setErrors(nextErrors)
    }
  }

  return (
    <div className="page-content">
      <div className="container-fluid">
        <div className="row pb-1 page-subheader-sticky bg-body">
          <div className="col-12">
            <div className="d-flex align-items-lg-center flex-lg-row flex-column py-2">
              <div className="flex-grow-1">
                <h4 className="fs-20 mb-1">Edit Roles &amp; Permissions</h4>
                <nav aria-label="breadcrumb" className="d-block">
                  <ol className="breadcrumb m-0">
                    <li className="breadcrumb-item"><Link to="/">Dashboard</Link></li>
                    <li className="breadcrumb-item"><Link to="/roles-permissions">Roles &amp; Permissions</Link></li>
                    <li className="breadcrumb-item active" aria-current="page">Edit</li>
                  </ol>
                </nav>
              </div>
              <div className="page-actions d-flex align-items-center gap-2 mt-3 mt-lg-0">
                <button type="button" className="btn btn-outline-secondary w-lg" onClick={() => navigate(-1)}>
                  <i className="ri-arrow-left-line align-middle me-1"></i> Back
                </button>
                <button type="button" className="btn btn-primary w-lg" onClick={handleSave} disabled={updating}>
                  {updating ? (
                    <>
                      <span className="spinner-border spinner-border-sm align-middle me-2" aria-hidden="true"></span>
                      Saving...
                    </>
                  ) : (
                    <>
                      <i className="ri-save-3-line align-middle me-1"></i> Save
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div >

        <div className="row">
          <div className="col-xxl-12">
            <div className="card">
              <div className="card-body" style={{ minHeight: '73vh' }}>
                <div className="role-form">
                  <div className="mb-4">
                    <label className="form-label">Role name <span className="text-danger">*</span></label>
                    <input type="text" className="form-control" placeholder="Enter a role name" value={roleName} onChange={(e) => setRoleName(e.target.value)} />
                    {errors.name && <div className="text-danger mt-1 small">{errors.name}</div>}
                  </div>

                  <div className="mb-4">
                    <label className="form-label">Description</label>
                    <textarea className="form-control" placeholder="Enter role description" rows={3} value={description} onChange={(e) => setDescription(e.target.value)}></textarea>
                    {errors.description && <div className="text-danger mt-1 small">{errors.description}</div>}
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Role Permissions</label>
                    <div className="d-flex align-items-center gap-3">
                      <div className="form-check form-switch">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id="adminAccessToggle"
                          checked={adminAccess}
                          onChange={(e) => {
                            const next = e.target.checked
                            setAdminAccess(next)
                            toggleAllPermissions(next)
                          }}
                        />
                        <label className="form-check-label" htmlFor="adminAccessToggle">Administrator Access</label>
                      </div>
                    </div>
                  </div>

                  <div className="row g-4">
                    <div className="col-lg-12">
                      <div className="perm-card">
                        <div className="d-flex align-items-center justify-content-between mb-4">
                          <h6 className="section-title">Module Permissions</h6>
                        </div>
                        {errors.permission_ids && <div className="text-danger small mb-2">{errors.permission_ids}</div>}
                        {/* Loading and error states */}
                        {permsLoading && <PermissionCardsLoader />}
                        {permsError && !permsLoading && <ErrorState message="Failed to load permissions. Please try again." />}
                        {detailError && !permsLoading && <ErrorState message={detailError} />}
                        <div className="permissions-list-wrapper mt-2" style={{ display: permsLoading ? 'none' : undefined }}>
                          {!permsLoading && modules.map((mod) => {
                            const allChecked = isModuleAllChecked(mod)
                            return (
                              <div className="card shadow-none border mb-3" key={mod.key}>
                                <div className="card-header bg-light-subtle bg-opacity-75 border-bottom d-flex flex-wrap align-items-center justify-content-between p-3">
                                  <div className="d-flex align-items-center gap-2">
                                    <h6 className="card-title mb-0 fs-15 text-dark fw-semibold">
                                      <i className="ri-folder-shield-2-line text-primary me-2 align-middle fs-16"></i>
                                      {mod.name}
                                    </h6>
                                    {mod.desc && <span className="text-muted fs-13 ms-2 d-none d-sm-inline-block">({mod.desc})</span>}
                                  </div>
                                  <div className="form-check form-switch m-0 d-flex align-items-center">
                                    <input
                                      className="form-check-input cursor-pointer"
                                      type="checkbox"
                                      id={`selectAll-${mod.key}`}
                                      role="switch"
                                      checked={allChecked}
                                      onChange={(e) => toggleModuleAll(mod, e.target.checked)}
                                    />
                                    <label className="form-check-label fs-13 fw-medium text-dark ms-2 cursor-pointer" htmlFor={`selectAll-${mod.key}`}>Select All</label>
                                  </div>
                                </div>
                                <div className="card-body p-3">
                                  <div className="d-flex flex-wrap gap-3">
                                    {mod.permissions.map((p) => {
                                      const checked = !!selected[mod.key]?.[p.key]
                                      return (
                                        <div className="form-check form-check-inline m-0 me-4 py-1" key={mod.key + '-' + p.key}>
                                          <input
                                            className={`form-check-input cursor-pointer shadow-none ${checked ? 'border-primary' : 'border-secondary-subtle'}`}
                                            type="checkbox"
                                            id={`perm-${mod.key}-${p.key}`}
                                            checked={checked}
                                            onChange={(e) => togglePerm(mod, p.key, e.target.checked)}
                                            style={{ width: "1.15em", height: "1.15em", marginTop: "0.15em" }}
                                          />
                                          <label className={`form-check-label cursor-pointer ms-1 fs-14 ${checked ? 'text-dark fw-medium' : 'text-muted'}`} htmlFor={`perm-${mod.key}-${p.key}`}>
                                            {p.label}
                                          </label>
                                        </div>
                                      )
                                    })}
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          </div >
        </div >

      </div >
    </div >
  )
}
