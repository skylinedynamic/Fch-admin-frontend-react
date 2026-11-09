import type { OwnerCommissions } from '../../../modules/owner-summary';
import { money } from './format';

/**
 * Commission on deals funded in the period, as the commission records book
 * it. Nothing records the lender paying the host, so this is never cash.
 */
export default function CommissionsCard({ data }: { data: OwnerCommissions }) {
    return (
        <div className="os-card os-gap" data-testid="owner-commissions">
            <div>
                <h2 className="os-card-title">Funding commissions</h2>
                <p className="os-card-sub">Booked on deals funded this period; not cash until the lender pays</p>
            </div>
            <div className="os-line"><span>Host share booked</span><strong>{money(data.host_share_booked)}</strong></div>
            <div className="os-line os-line--muted"><span>Partners' share</span><strong>{money(data.partner_share)}</strong></div>
            <div className="os-line os-line--muted"><span>Paid out to partners</span><strong>{money(data.paid_to_partners)}</strong></div>
            <div className="os-line os-line--muted"><span>Paid out to staff</span><strong>{money(data.paid_to_staff)}</strong></div>
            <div className="os-line os-line--due"><span>Payouts still due</span><strong>{money(data.payouts_due)}</strong></div>
        </div>
    );
}
