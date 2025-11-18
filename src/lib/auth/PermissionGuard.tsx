import React from 'react'
import { hasAnyPermission, hasAllPermissions, hasRole } from './rbac'

type Props = {
  any?: string[]
  all?: string[]
  role?: string | string[]
  fallback?: React.ReactNode
  children: React.ReactNode
}

export default function PermissionGuard({ any, all, role, fallback = null, children }: Props) {
  const okAny = any ? hasAnyPermission(any) : true
  const okAll = all ? hasAllPermissions(all) : true
  const okRole = role ? hasRole(role) : true
  if (okAny && okAll && okRole) return <>{children}</>
  return <>{fallback}</>
}
