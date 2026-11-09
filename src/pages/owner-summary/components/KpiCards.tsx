import type { OwnerSummaryKpis } from '../../../modules/owner-summary';
import { compactMoney, count, delta, type DeltaTone } from './format';

interface Kpi {
    label: string;
    value: string;
    tag: string;
    tone: DeltaTone | 'warn';
    note: string;
}

function kpis(k: OwnerSummaryKpis, overdue: number): Kpi[] {
    const cash = delta(k.cash_collected.current, k.cash_collected.previous);
    const funded = delta(k.funded.amount, k.funded.previous_amount);
    const clients = delta(k.new_clients.current, k.new_clients.previous);
    const leads = delta(k.new_leads.current, k.new_leads.previous);
    const average = k.funded.deals > 0 ? ` · avg ${compactMoney(k.funded.amount / k.funded.deals)}` : '';

    return [
        { label: 'Cash collected', value: compactMoney(k.cash_collected.current), tag: cash.text, tone: cash.tone, note: `vs ${compactMoney(k.cash_collected.previous)} before` },
        {
            label: 'Owed to us',
            value: compactMoney(k.outstanding.amount),
            tag: overdue > 0 ? `${overdue} over 30 days` : 'none overdue',
            tone: overdue > 0 ? 'warn' : 'flat',
            note: count(k.outstanding.invoices, 'open invoice', 'open invoices'),
        },
        { label: 'Funded volume', value: compactMoney(k.funded.amount), tag: funded.text, tone: funded.tone, note: `${count(k.funded.deals, 'deal', 'deals')}${average}` },
        { label: 'New clients', value: k.new_clients.current.toLocaleString(), tag: clients.text, tone: clients.tone, note: `vs ${k.new_clients.previous.toLocaleString()} before` },
        { label: 'New leads', value: k.new_leads.current.toLocaleString(), tag: leads.text, tone: leads.tone, note: `vs ${k.new_leads.previous.toLocaleString()} before` },
        { label: 'Active partners', value: k.active_partners.current.toLocaleString(), tag: `of ${k.active_partners.total}`, tone: 'flat', note: 'sent a lead in 30 days' },
    ];
}

/** The six headline numbers, each with how it moved against the previous period. */
export default function KpiCards({ data, overdueInvoices }: { data: OwnerSummaryKpis; overdueInvoices: number }) {
    return (
        <div className="os-kpis" data-testid="owner-kpis">
            {kpis(data, overdueInvoices).map((kpi) => (
                <div className="os-card os-kpi" key={kpi.label}>
                    <span className="os-label">{kpi.label}</span>
                    <span className="os-kpi__value">{kpi.value}</span>
                    <div className="os-kpi__foot">
                        <span className={`os-tag os-tag--${kpi.tone}`}>{kpi.tag}</span>
                        <span>{kpi.note}</span>
                    </div>
                </div>
            ))}
        </div>
    );
}
