import React from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '../../store/auth'

/**
 * Route guard that checks if user is a host (is_host === 1)
 * Redirects to dashboard if user is not a host
 */
export default function HostRoute() {
    const user = useAuthStore((state) => state.user)
    const isHost = user?.is_host == 1

    if (!isHost) {
        return <Navigate to="/" replace />
    }

    return <Outlet />
}
