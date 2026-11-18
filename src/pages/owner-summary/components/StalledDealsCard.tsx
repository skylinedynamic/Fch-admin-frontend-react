import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { StalledDeal } from '../../../modules/owner-summary';
import { OWNER_SUMMARY_LINKS, STALLED_AFTER_DAYS } from '../../../config/ownerSummary';
import { compactMoney, count, money } from './format';
import SelectMenu, { type SelectMenuOption } from './SelectMenu';

const SORT = { IDLE: 'idle', AMOUNT: 'amount' } as const;
type Sort = typeof SORT[keyof typeof SORT];

const SORT_OPTIONS: SelectMenuOption<Sort>[] = [
    { value: SORT.IDLE, label: 'Days idle (longest)' },
    { value: SORT.AMOUNT, label: 'Amount (largest)' },
];

/** A month idle is late; anything past STALLED_AFTER_DAYS is already stalled. */
const LONG_IDLE_DAYS = 30;

interface StalledDealsCardProps {
    deals: StalledDeal[];
    /** Every stalled deal and what they ask for; the API lists the longest-waiting ones only. */
    total: number;
    totalRequested: number;
}

/** Open deals with no status change for STALLED_AFTER_DAYS days. */
export default function StalledDealsCard({ deals, total, totalRequested }: StalledDealsCardProps) {
    const [sort, setSort] = useState<Sort>(SORT.IDLE);
    const sorted = useMemo(
        () => [...deals].sort((a, b) => (sort === SORT.AMOUNT ? b.requested_amount - a.requested_amount : b.days_in_status - a.days_in_status)),
        [deals, sort]
    );

    return (
        <div className="os-card os-card--flush" data-testid="owner-stalled">
            <div className="os-card__head os-header" style={{ alignItems: 'center' }}>
                <div>
                    <div className="os-legend" style={{ gap: 10 }}>
                        <h2 className="os-card-title">Stalled Deals</h2>
                        <span className="os-tag os-tag--warn">{count(total, 'deal', 'deals')} · {compactMoney(totalRequested)} requested</span>
                    </div>
                    <p className="os-card-sub">Open applications with no status change in the last {STALLED_AFTER_DAYS} days, as of now</p>
                </div>
                {deals.length > 1 && (
                    <SelectMenu label="Sort by" value={sort} options={SORT_OPTIONS} onChange={setSort} />
                )}
            </div>
            {deals.length === 0 ? (
                <p className="os-empty">No stalled deals.</p>
            ) : (
                <>
                    <div className="os-scroll">
                        <table className="os-tbl">
                            <thead>
                                <tr>
                                    <th scope="col">Application</th>
                                    <th scope="col">Business</th>
                                    <th scope="col">Partner</th>
                                    <th scope="col">Status</th>
                                    <th scope="col" className="os-num">Requested</th>
                                    <th scope="col" className="os-num">Days idle</th>
                                    <th scope="col"><span className="visually-hidden">Action</span></th>
                                </tr>
                            </thead>
                            <tbody>
                                {sorted.map((deal) => (
                                    <tr key={deal.id}>
                                        <td style={{ fontWeight: 600, color: 'var(--os-navy)' }}>{deal.application_number ?? `#${deal.id}`}</td>
                                        <td>{deal.client ?? '—'}</td>
                                        <td>{deal.partner ?? '—'}</td>
                                        <td><span className="os-tag os-tag--status">{deal.status}</span></td>
                                        <td className="os-num">{money(deal.requested_amount)}</td>
                                        <td className="os-num"><span className={deal.days_in_status >= LONG_IDLE_DAYS ? 'os-idle--long' : 'os-idle'}>{deal.days_in_status} days</span></td>
                                        <td>
                                            <Link to={`${OWNER_SUMMARY_LINKS.FUNDING_APPLICATIONS}/${deal.id}`} style={{ fontSize: 13, fontWeight: 600 }} aria-label={`Open ${deal.application_number ?? deal.id}`}>Open</Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="os-card__head" style={{ borderBottom: 0, fontSize: 13, color: 'var(--os-muted)' }}>
                        Showing {deals.length} of {total}, longest waiting first
                    </div>
                </>
            )}
        </div>
    );
}
