import { Link } from 'react-router-dom';
import type { OwnerAttention } from '../../../modules/owner-summary';
import { OWNER_SUMMARY_LINKS, STALLED_AFTER_DAYS, UNPAID_AGE_DAYS } from '../../../config/ownerSummary';
import { count, money } from './format';

type Tone = 'red' | 'amber' | 'plain';

interface Item {
    label: string;
    sub: string;
    count: number;
    tone: Tone;
    to: string;
}

function items(a: OwnerAttention): Item[] {
    return [
        { label: `Invoices unpaid over ${UNPAID_AGE_DAYS} days`, sub: `${money(a.unpaid_over_30_days.amount)} not paid`, count: a.unpaid_over_30_days.invoices, tone: 'red', to: OWNER_SUMMARY_LINKS.INVOICES },
        { label: 'Failed invoices', sub: `${money(a.failed_invoices.amount)} where payment failed`, count: a.failed_invoices.invoices, tone: 'red', to: OWNER_SUMMARY_LINKS.INVOICES },
        { label: 'Partners owing us', sub: 'With an unpaid or failed invoice', count: a.partners_owing, tone: 'red', to: OWNER_SUMMARY_LINKS.PARTNERS },
        { label: 'Suspended partners', sub: 'Portal suspended', count: a.suspended_partners, tone: 'red', to: OWNER_SUMMARY_LINKS.PARTNERS },
        { label: 'Failed or disputed payments', sub: `${a.failed_payments} failed · ${a.disputed_payments} disputed this period`, count: a.failed_payments + a.disputed_payments, tone: 'amber', to: OWNER_SUMMARY_LINKS.PAYMENTS },
        { label: 'Manual payments to approve', sub: 'Waiting for review', count: a.manual_payments_to_approve, tone: 'amber', to: OWNER_SUMMARY_LINKS.PAYMENTS },
        { label: 'Commission payouts due', sub: `${money(a.payouts_due.amount)} owed to partners and staff on deals funded this period`, count: a.payouts_due.deals, tone: 'amber', to: OWNER_SUMMARY_LINKS.COMMISSIONS },
        { label: 'Stalled deals', sub: `No status change in ${STALLED_AFTER_DAYS} days`, count: a.stalled_deals, tone: 'amber', to: OWNER_SUMMARY_LINKS.FUNDING_APPLICATIONS },
        { label: 'Embedded-form applications', sub: 'Not reviewed yet', count: a.unreviewed_embedded_applications, tone: 'plain', to: OWNER_SUMMARY_LINKS.EMBEDDED_APPLICATIONS },
        { label: 'Pre-qualifications pending', sub: 'Waiting for a decision', count: a.pending_prequalifications, tone: 'plain', to: OWNER_SUMMARY_LINKS.PRE_QUALIFICATIONS },
        { label: 'Free trials ending', sub: `${count(a.trials_ending.partners, 'partner', 'partners')} · ${count(a.trials_ending.clients, 'client', 'clients')} with a trial ending this period`, count: a.trials_ending.partners + a.trials_ending.clients, tone: 'plain', to: OWNER_SUMMARY_LINKS.PARTNERS },
    ];
}

/** What came in during the period and still waits on the host; suspended partners and stalled deals as of now. */
export default function NeedsAttention({ data }: { data: OwnerAttention }) {
    return (
        <div className="os-card os-card--flush" data-testid="owner-attention">
            <div className="os-card__head">
                <h2 className="os-card-title">Needs Attention</h2>
                <p className="os-card-sub">What came in this period and still waits · suspended partners and stalled deals as of now</p>
            </div>
            <div className="os-attention">
                {items(data).map((item) => (
                    <div className="os-attention__item" key={item.label}>
                        <div style={{ minWidth: 0 }}>
                            <div className="os-attention__label">{item.label}</div>
                            <div className="os-attention__sub">{item.sub}</div>
                        </div>
                        <div className="os-attention__end">
                            <span className={`os-attention__count os-count--${item.count > 0 ? item.tone : 'zero'}`}>{item.count}</span>
                            <Link to={item.to} className="os-attention__link" aria-label={`Review ${item.label.toLowerCase()}`}>Review</Link>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
