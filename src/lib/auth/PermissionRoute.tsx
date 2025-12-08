import React from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { hasPermission } from './rbac'
import { getUser } from './auth'

type Props = {
    permission: string
    redirectTo?: string
}

/**
 * Route guard that checks if user has specific permission
 * Redirects to dashboard or specified route if permission is missing
 */
export default function PermissionRoute({ permission, redirectTo = '/' }: Props) {
    const user = getUser()
    const allowed = hasPermission(permission)

    // Debug logging
    if (!allowed) {
        console.log('🚫 Permission Denied:', {
            requiredPermission: permission,
            userPermissions: user?.permissions || [],
            userType: user?.user_type,
            userName: user?.name,
            redirectingTo: redirectTo
        })
    }

    if (!allowed) {
        // User doesn't have permission - redirect to dashboard
        return <Navigate to={redirectTo} replace />
    }

    return <Outlet />
}
