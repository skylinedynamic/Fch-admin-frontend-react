import type { OwnerLeadSources } from '../../../modules/owner-summary';
import { LEAD_SOURCE_NOT_SET } from '../../../config/ownerSummary';
import { percent } from './format';

const COLORS = ['#001f3f', '#1f4a7a', '#3a6ea5', '#8fb3d9', '#f7b84b', '#c9ced4', '#adb5bd', '#dee2e6', '#e9ecef', '#f1f3f5'];

const sourceName = (source: string) => (source === LEAD_SOURCE_NOT_SET ? 'Source not set' : source);

/** New leads by the source recorded on them, plus the ways in that are not leads. */
export default function LeadSourcesCard({ data }: { data: OwnerLeadSources }) {
    const leads = data.leads.filter((row) => row.count > 0).sort((a, b) => b.count - a.count);
    const total = leads.reduce((sum, row) => sum + row.count, 0);

    return (
        <div className="os-card os-grow-side" style={{ gap: 16 }} data-testid="owner-sources">
            <div>
                <h2 className="os-card-title">Where Leads Come From</h2>
                <p className="os-card-sub">{total} leads, by lead source</p>
            </div>
            {leads.length === 0 ? (
                <p className="os-card-sub" style={{ margin: 0 }}>No new leads this period.</p>
            ) : (
                <>
                    <div className="os-stackbar" style={{ height: 14 }} role="img" aria-label={leads.map((row) => `${sourceName(row.source)} ${percent(row.count, total)}%`).join(', ')}>
                        {leads.map((row, i) => (
                            <div key={row.source} style={{ width: `${percent(row.count, total)}%`, background: COLORS[i % COLORS.length] }}></div>
                        ))}
                    </div>
                    <div className="os-gap" style={{ gap: 10 }}>
                        {leads.map((row, i) => (
                            <div className="os-source" key={row.source}>
                                <span className="os-swatch" style={{ background: COLORS[i % COLORS.length] }}></span>
                                <span className="os-source__name">{sourceName(row.source)}</span>
                                <span className="os-source__count">{row.count}</span>
                                <span className="os-source__pct">{percent(row.count, total)}%</span>
                            </div>
                        ))}
                    </div>
                </>
            )}
            <div className="os-divider">
                <span className="os-label">Other Ways In</span>
                <div className="os-line"><span>Pre-qualification requests</span><strong>{data.prequalifications}</strong></div>
                <div className="os-line"><span>Embedded-form applications</span><strong>{data.embedded_applications}</strong></div>
            </div>
        </div>
    );
}
