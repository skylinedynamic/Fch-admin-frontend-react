import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../store/auth'
import { PORTAL_HOME_ROUTE } from '../../config/passwordChange'

/**
 * Guards the Set password screen: only a signed-in user who must change their
 * password reaches it. Anyone signed out signs in first; anyone who already
 * chose their own password goes to the portal home.
 */
export default function ForcePasswordRoute() {
  const location = useLocation()
  const token = useAuthStore((state) => state.token)
  const mustChange = useAuthStore((state) => !!state.user?.must_change_password)

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (!mustChange) {
    return <Navigate to={PORTAL_HOME_ROUTE} replace />
  }

  return <Outlet />
}
