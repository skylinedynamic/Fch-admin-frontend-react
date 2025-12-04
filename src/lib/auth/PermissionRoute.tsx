import React from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { hasPermission } from './rbac'

type Props = {
    permission: string
    redirectTo?: string
}

/**
 * Route guard that checks if user has specific permission
 * Redirects to dashboard or specified route if permission is missing
 */
export default function PermissionRoute({ permission, redirectTo = '/' }: Props) {
    const allowed = hasPermission(permission)

    if (!allowed) {
        return <Navigate to={redirectTo} replace />
    }

    return <Outlet />
}
