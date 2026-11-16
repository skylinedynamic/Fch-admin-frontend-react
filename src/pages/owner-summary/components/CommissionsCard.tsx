import type { OwnerCommissions } from '../../../modules/owner-summary';
import { money } from './format';

/**
 * Commission on deals closed (Closed - Completed) in the period. A deal closes
 * once the lender pays, so this is commission already earned.
 */
export default function CommissionsCard({ data }: { data: OwnerCommissions }) {
    return (
        <div className="os-card os-gap" data-testid="owner-commissions">
            <div>
                <h2 className="os-card-title">Funding Commissions</h2>
                <p className="os-card-sub">Commission on deals closed this period</p>
            </div>
            <div className="os-line"><span>FCH share booked</span><strong>{money(data.host_share_booked)}</strong></div>
            <div className="os-line os-line--muted"><span>Partners' share</span><strong>{money(data.partner_share)}</strong></div>
            <div className="os-line os-line--muted"><span>Paid out to partners</span><strong>{money(data.paid_to_partners)}</strong></div>
            <div className="os-line os-line--muted"><span>Paid out to staff</span><strong>{money(data.paid_to_staff)}</strong></div>
            <div className="os-line os-line--due"><span>Payouts still due</span><strong>{money(data.payouts_due)}</strong></div>
        </div>
    );
}
