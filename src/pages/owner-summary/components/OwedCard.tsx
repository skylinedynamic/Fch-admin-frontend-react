import type { OwnerReceivables } from '../../../modules/owner-summary';
import { UNPAID_AGE_DAYS } from '../../../config/ownerSummary';
import { compactMoney, count, money, percent } from './format';

/** Invoices raised in the period still owed to the host, split by how late they are. */
export default function OwedCard({ data }: { data: OwnerReceivables }) {
    const parts = [
        { label: `Unpaid over ${UNPAID_AGE_DAYS} days`, color: 'var(--os-red)', ...data.unpaid_over_30_days },
        { label: `Unpaid under ${UNPAID_AGE_DAYS} days`, color: 'var(--os-sky)', ...data.unpaid_recent },
        { label: 'Payment failed', color: 'var(--os-yellow)', ...data.failed },
    ];
    const amount = parts.reduce((sum, part) => sum + part.amount, 0);
    const invoices = parts.reduce((sum, part) => sum + part.invoices, 0);

    return (
        <div className="os-card os-gap" data-testid="owner-owed">
            <div>
                <h2 className="os-card-title">Owed To Four Corner</h2>
                <p className="os-card-sub">Invoices raised this period, still unpaid</p>
            </div>
            <div className="os-big">
                <span className="os-big__value">{compactMoney(amount)}</span>
                <span className="os-big__note">{count(invoices, 'invoice', 'invoices')}</span>
            </div>
            <div className="os-stackbar" role="img" aria-label={parts.map((part) => `${part.label} ${money(part.amount)}`).join(', ')}>
                {parts.map((part) => (
                    <div key={part.label} style={{ width: `${percent(part.amount, amount)}%`, background: part.color }}></div>
                ))}
            </div>
            {parts.map((part) => (
                <div className="os-line" key={part.label}>
                    <span className="os-legend"><span className="os-swatch" style={{ background: part.color }}></span>{part.label}</span>
                    <span>{part.invoices} · <strong>{money(part.amount)}</strong></span>
                </div>
            ))}
        </div>
    );
}
