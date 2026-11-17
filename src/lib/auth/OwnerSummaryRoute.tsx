import { Navigate, Outlet } from 'react-router-dom'
import { useCanViewOwnerSummary } from './useCanViewOwnerSummary'

/** Route guard for Business Insights (see useCanViewOwnerSummary); anyone else goes to the dashboard. */
export default function OwnerSummaryRoute() {
    const canView = useCanViewOwnerSummary()

    if (!canView) {
        return <Navigate to="/" replace />
    }

    return <Outlet />
}
