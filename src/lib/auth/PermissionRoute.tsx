import React from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { hasPermission } from './rbac'
import { getUser } from './auth'
import { isSubscriptionRestricted } from './subscriptionUtils'

type Props = {
    permission: string
    redirectTo?: string
}

/**
 * Route guard that checks if user has specific permission
 * Redirects to dashboard or specified route if permission is missing
 * Also enforces subscription restrictions for non-host partners.
 */
export default function PermissionRoute({ permission, redirectTo = '/' }: Props) {
    const user = getUser()
    const isRestricted = isSubscriptionRestricted(user)
    
    // Check if the current route is allowed even when restricted
    const isAllowedWhenRestricted = ['view dashboard', 'view invoices', 'view payments'].includes(permission)
    
    // If restricted and NOT on an allowed route, block access
    const allowed = hasPermission(permission) && (!isRestricted || isAllowedWhenRestricted)

    // Debug logging
    if (!allowed) {
        console.log('🚫 Access Denied:', {
            requiredPermission: permission,
            isRestricted,
            userPermissions: user?.permissions || [],
            userType: user?.user_type,
            userName: user?.name,
            redirectingTo: redirectTo
        })
    }

    if (!allowed) {
        // User doesn't have permission or is restricted - redirect
        // If restricted, we usually redirect to dashboard
        const targetRedirect = isRestricted ? '/' : '/access-denied';
        return <Navigate to={targetRedirect} replace />
    }

    return <Outlet />
}
