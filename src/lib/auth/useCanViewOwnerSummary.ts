import { useAuthStore } from '../../store/auth'
import { OWNER_SUMMARY_ALLOWED_EMAILS } from '../../config/ownerSummary'

/**
 * True for whoever may open Business Insights: for now only the logins in
 * OWNER_SUMMARY_ALLOWED_EMAILS, whatever their role. This decides what the
 * menu and the route offer; the API does not check the email for now.
 */
export function useCanViewOwnerSummary(): boolean {
    const email = useAuthStore((state) => (state.user as { email?: unknown } | null)?.email)

    return OWNER_SUMMARY_ALLOWED_EMAILS.includes(String(email ?? '').trim().toLowerCase())
}
