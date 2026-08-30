import React from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '../../store/auth'
import { ENTITY_TYPE_PARTNER } from '../../config/appConfig'

/**
 * Route guard that checks if user is a host (is_host === 1) and entity_type is Partner.
 * Redirects to dashboard if not authorized.
 */
export default function PartnerHostRoute() {
    const user = useAuthStore((state) => state.user)
    const isHost = user?.is_host == 1
    const isPartner = user?.entity_type === ENTITY_TYPE_PARTNER

    if (!isHost || !isPartner) {
        return <Navigate to="/" replace />
    }

    return <Outlet />
}
