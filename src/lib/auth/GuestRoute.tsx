import { Navigate, Outlet } from 'react-router-dom'
import { isAuthenticated } from './auth'

export default function GuestRoute(): JSX.Element {

  if (isAuthenticated()) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
