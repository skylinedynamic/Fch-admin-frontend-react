import { COMMISSION_VIEWER, type CommissionStatistics, type CommissionViewer } from '../../../modules/commission';

export interface CommissionCard {
    title: string;
    value: number | string;
    icon: string;
    colorVariant: string;
    isCurrency?: boolean;
    isPercent?: boolean;
}

/**
 * The Commissions list's summary cards for this viewer (see modules/commission/viewer):
 * at most four, each titled by whose money it is. The API sends only the
 * figures the viewer may see; these pick which to show.
 */
export function commissionCards(viewer: CommissionViewer, stats: CommissionStatistics | undefined): CommissionCard[] {
    const n = (value: number | string | undefined) => Number(value) || 0;

    const completed: CommissionCard = { title: 'Completed Deals', value: n(stats?.completed_deals), icon: 'ri-checkbox-circle-line', colorVariant: 'success' };
    const myDeals: CommissionCard = { title: 'My Deals', value: n(stats?.total_deals), icon: 'ri-briefcase-line', colorVariant: 'primary' };

    switch (viewer) {
        case COMMISSION_VIEWER.HOST_OWNER:
            // The whole commission, how it splits, and what the host still has to pay out.
            return [
                { title: 'Total Commission', value: n(stats?.deal_commission_amount), icon: 'ri-money-dollar-circle-line', colorVariant: 'secondary', isCurrency: true },
                { title: 'Host Share', value: n(stats?.total_commission_amount), icon: 'ri-building-line', colorVariant: 'success', isCurrency: true },
                { title: 'Partner Share', value: n(stats?.partner_commission_amount), icon: 'ri-user-line', colorVariant: 'info', isCurrency: true },
                { title: 'Payouts Due', value: n(stats?.payouts_due_amount), icon: 'ri-error-warning-line', colorVariant: 'danger', isCurrency: true },
            ];

        case COMMISSION_VIEWER.PARTNER_OWNER:
            return [
                { title: 'My Total Commission', value: n(stats?.total_commission_amount), icon: 'ri-money-dollar-circle-line', colorVariant: 'secondary', isCurrency: true },
                { title: 'Received', value: n(stats?.paid_amount), icon: 'ri-wallet-line', colorVariant: 'success', isCurrency: true },
                { title: 'Awaiting Payment', value: n(stats?.unpaid_amount), icon: 'ri-time-line', colorVariant: 'warning', isCurrency: true },
                completed,
            ];

        case COMMISSION_VIEWER.HOST_STAFF:
            return [
                { title: 'Received', value: n(stats?.my_paid_amount), icon: 'ri-wallet-line', colorVariant: 'success', isCurrency: true },
                { title: 'Awaiting Payment', value: n(stats?.my_expected_amount), icon: 'ri-time-line', colorVariant: 'warning', isCurrency: true },
                myDeals,
                completed,
            ];

        case COMMISSION_VIEWER.PARTNER_STAFF:
            // Partner staff are paid nothing per deal by the system: deals, not money.
            return [
                myDeals,
                completed,
                { title: 'My Funded Amount', value: n(stats?.total_funded_amount), icon: 'ri-funds-line', colorVariant: 'warning', isCurrency: true },
            ];
    }
}
