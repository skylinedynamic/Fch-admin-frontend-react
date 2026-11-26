import { useEffect } from 'react'
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/auth'
import { clearAuth } from './auth'
import { logout } from './authApi'
import { parseDateOnly, startOfToday } from '../../utils/helper'
import { FORCE_PASSWORD_ROUTE } from '../../config/passwordChange'

/**
 * Whether the free trial's end date ("2026-06-30") has passed. The end date is
 * still a trial day, on the user's own calendar - the same rule as the API
 * (Partner::freeTrialExpired, which uses the X-Timezone the portal sends), the
 * menu lock (subscriptionUtils) and the Partners list (R3-BUG-026). It used to
 * run to 23:59 UTC, ending the trial hours early or late by timezone.
 */
function isTrialEndDateExpired(trialEndDate: string): boolean {
  const end = parseDateOnly(trialEndDate)
  return !!end && startOfToday() > end
}

export default function ProtectedRoute() {
  const location = useLocation()
  const navigate = useNavigate()
  const token = useAuthStore((state) => state.token)
  const mustChangePassword = useAuthStore((state) => !!state.user?.must_change_password)
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

  // Signed in with an issued password: nothing else until they choose their own.
  if (mustChangePassword) {
    return <Navigate to={FORCE_PASSWORD_ROUTE} replace />
  }

  if (isFreeTrial && isTrialExpired) {
    return null
  }

  return <Outlet />
}
