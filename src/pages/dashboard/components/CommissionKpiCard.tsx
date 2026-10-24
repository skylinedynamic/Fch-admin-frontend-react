import { Link } from 'react-router-dom';
import { formatCurrency } from '../../../utils/helper';
import { COMMISSION_VIEWER } from '../../../modules/commission';
import type { DashboardCommission } from '../../../modules/dashboard';

const money = (value: number) => formatCurrency(value, '$', 1, 0);

/**
 * What the card says for each viewer: one figure and where it links. The
 * figure is what was earned - funded deals, paid out or not; the paid/unpaid
 * breakdown lives on the Commissions page.
 */
function describe(commission: DashboardCommission) {
    switch (commission.viewer) {
        case COMMISSION_VIEWER.HOST_OWNER:
        case COMMISSION_VIEWER.PARTNER_OWNER:
            return { title: 'Commission Earned', value: money(commission.earned_amount), linkText: 'View all commissions' };
        case COMMISSION_VIEWER.HOST_STAFF:
            return { title: 'My Commission', value: money(commission.earned_amount), linkText: 'View my commissions' };
        case COMMISSION_VIEWER.PARTNER_STAFF:
            // Partner staff are paid nothing per deal by the system: deals, not money.
            return { title: 'My Deals', value: String(commission.deals), linkText: 'View my deals' };
    }
}

interface CommissionKpiCardProps {
    commission: DashboardCommission | undefined;
    /** counts.total_commission, from an API that predates the per-viewer card. */
    legacyTotal?: number;
    isLoading: boolean;
}

/** The dashboard's commission card, in the terms of whoever is looking (see modules/commission/viewer). */
export default function CommissionKpiCard({ commission, legacyTotal, isLoading }: CommissionKpiCardProps) {
    const card = commission
        ? describe(commission)
        : legacyTotal !== undefined
            ? { title: 'Total Commission', value: money(legacyTotal), linkText: 'View all commissions' }
            : null;
    const isDeals = commission?.viewer === COMMISSION_VIEWER.PARTNER_STAFF;

    return (
        <div className="col-xl-3 col-md-6 mb-3">
            <div className="card card-animate h-100 mb-0">
                <div className="card-body d-flex align-items-center">
                    <div className="flex-grow-1 overflow-hidden">
                        <p className="text-uppercase fw-medium text-muted text-truncate mb-2">{card?.title ?? 'Commission'}</p>
                        {isLoading || !card ? (
                            <div className="skeleton-line col-8 mb-2 d-block" style={{ height: '28px' }}></div>
                        ) : (
                            <h4 className="fs-22 fw-semibold ff-secondary mb-2">{card.value}</h4>
                        )}
                        {card && <Link to="/commissions" className="text-decoration-underline">{card.linkText}</Link>}
                    </div>
                    <div className="avatar-sm flex-shrink-0 ms-3">
                        <span className="avatar-title bg-primary-subtle rounded fs-3">
                            <i className={`${isDeals ? 'ri-briefcase-line' : 'bx bx-wallet'} text-primary`}></i>
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
