import React from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useIsHostPartner } from './useIsHostPartner'

/**
 * Route guard that checks if user is a host (is_host === 1) and entity_type is Partner.
 * Redirects to dashboard if not authorized.
 */
export default function PartnerHostRoute() {
    const isHostPartner = useIsHostPartner()

    if (!isHostPartner) {
        return <Navigate to="/" replace />
    }

    return <Outlet />
}
