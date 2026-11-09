import type { OwnerConversion, OwnerSummaryKpis } from '../../../modules/owner-summary';
import { compactMoney, delta, percent, type DeltaTone } from './format';

interface KpiRow {
    label: string;
    value: string;
}

interface Kpi {
    key: string;
    label: string;
    value: string;
    tag?: string;
    tone?: DeltaTone;
    note?: string;
    rows?: KpiRow[];
}

const NO_LEADS = '—';

const hostAndPartners = (host: string, partners: string): KpiRow[] => [
    { label: 'FCH', value: host },
    { label: 'Partners', value: partners },
];

/** "25% (1 of 4)". */
const conversionOf = ({ leads, funded }: OwnerConversion): string =>
    leads > 0 ? `${percent(funded, leads)}% (${funded} of ${leads})` : NO_LEADS;

function kpis(k: OwnerSummaryKpis): Kpi[] {
    const cash = delta(k.cash_collected.current, k.cash_collected.previous);
    const funded = delta(k.funded.amount, k.funded.previous_amount);
    const deals = delta(k.funded.deals, k.funded.previous_deals);
    const leads = delta(k.new_leads.current, k.new_leads.previous);
    const conversionLeads = k.lead_conversion.host.leads + k.lead_conversion.partners.leads;
    const conversionFunded = k.lead_conversion.host.funded + k.lead_conversion.partners.funded;

    return [
        { key: 'net', label: 'Net Earnings', value: compactMoney(k.cash_collected.current), tag: cash.text, tone: cash.tone, note: `vs ${compactMoney(k.cash_collected.previous)} before` },
        {
            key: 'funded',
            label: 'Funded Volume',
            value: compactMoney(k.funded.amount),
            tag: funded.text,
            tone: funded.tone,
            note: `vs ${compactMoney(k.funded.previous_amount)} before`,
            rows: hostAndPartners(compactMoney(k.funded.host.amount), compactMoney(k.funded.partners.amount)),
        },
        {
            key: 'deals',
            label: 'Funded Deals',
            value: k.funded.deals.toLocaleString(),
            tag: deals.text,
            tone: deals.tone,
            note: `vs ${k.funded.previous_deals.toLocaleString()} before`,
            rows: hostAndPartners(k.funded.host.deals.toLocaleString(), k.funded.partners.deals.toLocaleString()),
        },
        {
            key: 'partners',
            label: 'Partners',
            value: k.partners.total.toLocaleString(),
            rows: [
                { label: 'Active', value: k.partners.active.toLocaleString() },
                { label: 'New this period', value: k.partners.new.toLocaleString() },
            ],
        },
        {
            key: 'clients',
            label: 'Clients',
            value: k.clients.total.toLocaleString(),
            rows: [
                { label: 'Active', value: k.clients.active.toLocaleString() },
                { label: 'New this period', value: k.clients.new.toLocaleString() },
            ],
        },
        {
            key: 'leads',
            label: 'Leads',
            value: k.new_leads.current.toLocaleString(),
            tag: leads.text,
            tone: leads.tone,
            note: `vs ${k.new_leads.previous.toLocaleString()} before`,
            rows: hostAndPartners(k.new_leads.host.toLocaleString(), k.new_leads.partners.toLocaleString()),
        },
        {
            key: 'conversion',
            label: 'Lead-To-Funded',
            value: conversionLeads > 0 ? `${percent(conversionFunded, conversionLeads)}%` : NO_LEADS,
            note: 'leads that reached funded',
            rows: hostAndPartners(conversionOf(k.lead_conversion.host), conversionOf(k.lead_conversion.partners)),
        },
    ];
}

/** The seven headline numbers, split between the host and other partners where that applies. */
export default function KpiCards({ data }: { data: OwnerSummaryKpis }) {
    return (
        <div className="os-kpis" data-testid="owner-kpis">
            {kpis(data).map((kpi) => (
                <div className="os-card os-kpi" key={kpi.key} data-testid={`owner-kpi-${kpi.key}`}>
                    <span className="os-label">{kpi.label}</span>
                    <span className="os-kpi__value">{kpi.value}</span>
                    {(kpi.tag || kpi.note) && (
                        <div className="os-kpi__foot">
                            {kpi.tag && <span className={`os-tag os-tag--${kpi.tone}`}>{kpi.tag}</span>}
                            {kpi.note && <span>{kpi.note}</span>}
                        </div>
                    )}
                    {kpi.rows && (
                        <div className="os-kpi__rows">
                            {kpi.rows.map((row) => (
                                <div className="os-kpi__row" key={row.label}>
                                    <span>{row.label}</span>
                                    <strong>{row.value}</strong>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}
