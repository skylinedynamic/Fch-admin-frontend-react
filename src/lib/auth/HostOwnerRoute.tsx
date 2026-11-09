import { Navigate, Outlet } from 'react-router-dom'
import { useIsHostOwner } from './useIsHostOwner'

/** Route guard for the host owner's screens (see useIsHostOwner); anyone else goes to the dashboard. */
export default function HostOwnerRoute() {
    const isHostOwner = useIsHostOwner()

    if (!isHostOwner) {
        return <Navigate to="/" replace />
    }

    return <Outlet />
}
