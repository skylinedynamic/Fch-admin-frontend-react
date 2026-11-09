import { useAuthStore } from '../../store/auth'
import { ENTITY_TYPE_PARTNER } from '../../config/appConfig'
import { COMMISSION_MANAGE_PERMISSION } from '../../config/ownerSummary'

/**
 * True for whoever sees the host's whole book - the same rule as fch-api
 * CommissionViewer::HOST_OWNER: the host partner's own login, or host staff
 * who manage commissions. The API checks it again; this only decides what
 * the menu and the route offer.
 */
export function useIsHostOwner(): boolean {
    const user = useAuthStore((state) => state.user) as { is_host?: unknown; entity_type?: unknown; permissions?: unknown } | null

    if (!user || user.is_host != 1) {
        return false
    }

    const permissions = Array.isArray(user.permissions) ? user.permissions : []

    return user.entity_type === ENTITY_TYPE_PARTNER || permissions.includes(COMMISSION_MANAGE_PERMISSION)
}
