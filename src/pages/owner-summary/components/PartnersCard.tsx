import type { TopPartner } from '../../../modules/owner-summary';
import { PARTNER_TYPES } from '../../../config/partnerTypeOptions';
import { money } from './format';

const typeTag = (type: string | null) =>
    type === PARTNER_TYPES.CERTIFIED ? { label: 'Certified', className: 'os-tag os-tag--cert' } : { label: 'White-label', className: 'os-tag os-tag--wl' };

/** The partners that did most this period, by funded volume. */
export default function PartnersCard({ top }: { top: TopPartner[] }) {
    return (
        <div className="os-card os-grow-wide" data-testid="owner-top-partners">
            <h2 className="os-card-title">Top Partners</h2>
            <p className="os-card-sub">By funded volume, this period</p>
            {top.length === 0 ? (
                <p className="os-empty">No partner activity this period.</p>
            ) : (
                <div className="os-scroll">
                    <table className="os-tbl">
                        <thead>
                            <tr>
                                <th scope="col">Partner</th>
                                <th scope="col">Type</th>
                                <th scope="col" className="os-num">Leads</th>
                                <th scope="col" className="os-num">Funded</th>
                                <th scope="col" className="os-num">Volume</th>
                                <th scope="col" className="os-num">Commission paid</th>
                            </tr>
                        </thead>
                        <tbody>
                            {top.map((partner) => {
                                const tag = typeTag(partner.partner_type);
                                return (
                                    <tr key={partner.id}>
                                        <td style={{ fontWeight: 600 }}>{partner.company_name ?? '—'}</td>
                                        <td><span className={tag.className}>{tag.label}</span></td>
                                        <td className="os-num">{partner.leads}</td>
                                        <td className="os-num">{partner.funded_deals}</td>
                                        <td className="os-num" style={{ fontWeight: 600 }}>{money(partner.funded_amount)}</td>
                                        <td className="os-num">{money(partner.commission_paid)}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
