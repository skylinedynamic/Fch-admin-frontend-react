/**
 * Who is looking at commissions. The API decides it (fch-api CommissionViewer)
 * and sends it as `viewer` with the list cards, a commission's page and the
 * dashboard card; the screens only follow it:
 *
 *   host_owner     every deal and the host's share (also host staff who manage commissions)
 *   host_staff     their assigned clients' deals and their own payout only
 *   partner_owner  the partner's deals and its share
 *   partner_staff  their assigned clients' deals, with no commission money
 */
export const COMMISSION_VIEWER = {
    HOST_OWNER: 'host_owner',
    HOST_STAFF: 'host_staff',
    PARTNER_OWNER: 'partner_owner',
    PARTNER_STAFF: 'partner_staff',
} as const;

export type CommissionViewer = typeof COMMISSION_VIEWER[keyof typeof COMMISSION_VIEWER];

const KNOWN = Object.values(COMMISSION_VIEWER) as string[];

/**
 * The viewer the API sent, or - from an older API or a cached response that
 * sends none - the host flag's owner view, which is what the screens showed
 * before the API said.
 */
export function resolveCommissionViewer(
    viewer: string | null | undefined,
    user: Record<string, unknown> | null | undefined,
): CommissionViewer {
    if (viewer && KNOWN.includes(viewer)) {
        return viewer as CommissionViewer;
    }

    return user?.is_host == true ? COMMISSION_VIEWER.HOST_OWNER : COMMISSION_VIEWER.PARTNER_OWNER;
}
