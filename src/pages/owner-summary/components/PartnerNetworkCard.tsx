import type { OwnerAttention, OwnerPartners, OwnerSummaryKpis } from '../../../modules/owner-summary';
import { TRIAL_ENDING_DAYS } from '../../../config/ownerSummary';
import { percent } from './format';

interface PartnerNetworkCardProps {
    network: OwnerPartners;
    active: OwnerSummaryKpis['active_partners'];
    trialsEnding: OwnerAttention['trials_ending'];
}

/** The partner network at a glance. */
export default function PartnerNetworkCard({ network, active, trialsEnding }: PartnerNetworkCardProps) {
    return (
        <div className="os-card os-grow-side" style={{ gap: 16 }} data-testid="owner-network">
            <h2 className="os-card-title">Partner network</h2>
            <div className="os-tiles">
                <div className="os-tile os-tile--wl">
                    <div className="os-tile__label">White-label</div>
                    <div className="os-tile__value">{network.white_label}</div>
                </div>
                <div className="os-tile os-tile--cert">
                    <div className="os-tile__label">Certified</div>
                    <div className="os-tile__value">{network.certified}</div>
                </div>
            </div>
            <div className="os-gap" style={{ gap: 10 }}>
                <div>
                    <div className="os-line"><span>Active partners (lead in 30 days)</span><strong>{active.current} of {active.total}</strong></div>
                    <div className="os-progress"><div style={{ width: `${percent(active.current, active.total)}%` }}></div></div>
                </div>
                <div className="os-line os-line--muted"><span>New this period</span><strong>{network.new}</strong></div>
                <div className="os-line os-line--muted"><span>On free trial</span><strong>{network.on_trial} · {trialsEnding.partners} end within {TRIAL_ENDING_DAYS} days</strong></div>
                <div className="os-line os-line--muted"><span>Suspended</span><strong style={network.suspended > 0 ? { color: 'var(--os-red)' } : undefined}>{network.suspended}</strong></div>
            </div>
        </div>
    );
}
