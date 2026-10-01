import { useAuthStore } from '../../store/auth'
import { ENTITY_TYPE_PARTNER } from '../../config/appConfig'

/**
 * True for a signed-in user of the host partner: is_host is set AND the login
 * belongs to a Partner entity (a host's employee logins are not partner users).
 * The same rule PartnerHostRoute applies to whole routes, for showing or hiding
 * a part of a page - e.g. the Commissions setup on the User and Employee screens.
 */
export function useIsHostPartner(): boolean {
    const user = useAuthStore((state) => state.user)

    return user?.is_host == 1 && user?.entity_type === ENTITY_TYPE_PARTNER
}
