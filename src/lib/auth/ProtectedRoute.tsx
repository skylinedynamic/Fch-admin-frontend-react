import { useEffect } from 'react'
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/auth'
import { clearAuth } from './auth'
import { logout } from './authApi'

/**
 * Check if the free trial end date (UTC date string, e.g. "2026-06-30") has passed.
 * We treat the end date as end-of-day UTC (23:59:59.999Z) so the user has access
 * through the full calendar day the admin set, regardless of their local timezone.
 * Date.now() is always UTC milliseconds — no clock-format confusion.
 */
function isTrialEndDateExpired(trialEndDate: string): boolean {
  const endOfDayUtc = new Date(trialEndDate + 'T23:59:59.999Z').getTime()
  return Date.now() > endOfDayUtc
}

export default function ProtectedRoute() {
  const location = useLocation()
  const navigate = useNavigate()
  const token = useAuthStore((state) => state.token)
  const userSubscription = useAuthStore((state) => state.userSubscription)

  const isFreeTrial = !!userSubscription?.is_free_trail
  const trialEndDate = userSubscription?.free_trail_end_date as string | undefined

  const isTrialExpired = isFreeTrial && !!trialEndDate && isTrialEndDateExpired(trialEndDate)

  useEffect(() => {
    if (token && isFreeTrial && isTrialExpired) {
      const performLogout = async () => {
        try {
          await logout()
        } catch (err) {
          console.error('Trial expiration logout failed', err)
        } finally {
          clearAuth()
          navigate('/login', { replace: true })
        }
      }
      performLogout()
    }
  }, [token, isFreeTrial, isTrialExpired, navigate])

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (isFreeTrial && isTrialExpired) {
    return null
  }

  return <Outlet />
}
