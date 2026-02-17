import { useMemo } from 'react'
import { useAuthStore } from '../../store/auth/authStore'
import { isSubscriptionRestricted } from './subscriptionUtils'

/**
 * Custom hook to access user permissions
 * Returns permissions array and helper functions
 */
export function usePermissions() {
    const user = useAuthStore((state) => state.user)

    const subscription = useAuthStore((state) => state.userSubscription)
 
    const permissions = useMemo(() => {
        if (!user?.permissions || !Array.isArray(user.permissions)) {
            return []
        }
        return user.permissions.filter((p): p is string => typeof p === 'string')
    }, [user])
 
    const isRestricted = useMemo(() => isSubscriptionRestricted(subscription), [subscription])

    const hasPermission = useMemo(() => (permission: string): boolean => {
        return permissions.includes(permission)
    }, [permissions])

    const hasAnyPermission = useMemo(() => (required: string[]): boolean => {
        return required.some((p) => permissions.includes(p))
    }, [permissions])

    const hasAllPermissions = useMemo(() => (required: string[]): boolean => {
        return required.every((p) => permissions.includes(p))
    }, [permissions])

    return {
        permissions,
        isRestricted,
        hasPermission,
        hasAnyPermission,
        hasAllPermissions,
    }
}
