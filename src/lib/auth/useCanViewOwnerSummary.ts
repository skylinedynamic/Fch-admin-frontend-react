import { usePermissions } from './usePermissions'
import { OWNER_SUMMARY_PERMISSION } from '../../config/ownerSummary'

/**
 * True for whoever may open Business Insights: a login holding "view business
 * insights", a developer-only permission (fch-api gives it to the Developer
 * role alone and checks it again). This decides what the menu and the route offer.
 */
export function useCanViewOwnerSummary(): boolean {
    const { hasPermission } = usePermissions()

    return hasPermission(OWNER_SUMMARY_PERMISSION.VIEW)
}
