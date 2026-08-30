import React from 'react'
import { hasAnyPermission, hasAllPermissions, hasRole } from './rbac'
import { isSubscriptionRestricted } from './subscriptionUtils'
import { getUser } from './auth'

type Props = {
  any?: string[]
  all?: string[]
  role?: string | string[]
  fallback?: React.ReactNode
  children: React.ReactNode
}

/**
 * Component guard that conditionally renders children based on permissions.
 * Also respects subscription restrictions for non-host partners.
 */
export default function PermissionGuard({ any, all, role, fallback = null, children }: Props) {
  const user = getUser()
  const isRestricted = isSubscriptionRestricted(user)

  // If restricted, we generally hide the component unless it's explicitly allowed.
  // PermissionGuard usually wraps fine-grained UI elements.
  // We'll allow a small set of "essential" permissions even when restricted.
  const essentialPermissions = ['view dashboard', 'view invoices', 'view payments']
  
  const isEssential = (perms: string[] | undefined) => 
    perms ? perms.some(p => essentialPermissions.includes(p)) : false

  if (isRestricted && !isEssential(any) && !isEssential(all)) {
    return <>{fallback}</>
  }

  const okAny = any ? hasAnyPermission(any) : true
  const okAll = all ? hasAllPermissions(all) : true
  const okRole = role ? hasRole(role) : true
  
  if (okAny && okAll && okRole) return <>{children}</>
  return <>{fallback}</>
}
