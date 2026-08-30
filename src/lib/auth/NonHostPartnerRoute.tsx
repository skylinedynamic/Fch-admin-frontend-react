import React from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '../../store/auth/authStore'
import { ENTITY_TYPE_PARTNER } from '../../config/appConfig'

/**
 * Route guard that checks if user is a non-host partner (is_host == 0 && entity_type === Partner)
 * and has a valid first_payment_date.
 * Redirects to dashboard if user does not meet criteria.
 */
export default function NonHostPartnerRoute() {
    const user = useAuthStore((state) => state.user)
    const isHost = user?.is_host == 1 || user?.is_host === true
    const isPartner = user?.entity_type === ENTITY_TYPE_PARTNER
    const hasFirstPaymentDate = Boolean(user?.first_payment_date)

    if (isHost || !isPartner || !hasFirstPaymentDate) {
        return <Navigate to="/" replace />
    }

    return <Outlet />
}
