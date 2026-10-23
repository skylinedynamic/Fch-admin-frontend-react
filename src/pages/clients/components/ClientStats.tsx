import React from 'react';
import StatisticsCard from '../../../components/Common/StatisticsCard';
import StatisticsCardSkeleton from '../../../components/Common/StatisticsCardSkeleton';
import { ClientListStatistics } from '../../../modules/client/types';

interface ClientStatsProps {
    isHost: boolean;
    partnerId?: string | number | unknown;
    filteredTotal?: number;
    stats: ClientListStatistics | null;
    isLoading?: boolean;
}

interface ClientCard {
    title: string;
    count: number;
    icon: string;
    colorVariant: string;
}

/**
 * The Clients list cards. The host (and its staff) sees its whole book and how
 * it splits between its own clients and its partners'; a partner sees its own
 * clients by status.
 */
function clientCards(isHost: boolean, stats: ClientListStatistics): ClientCard[] {
    const total: ClientCard = { title: 'Total Clients', count: stats.total_borrowers || 0, icon: 'ri-group-line', colorVariant: 'info' };
    const active: ClientCard = { title: 'Active Clients', count: stats.active_borrowers || 0, icon: 'ri-user-line', colorVariant: 'success' };

    if (isHost) {
        return [
            total,
            { title: 'Host Clients', count: stats.host_borrowers || 0, icon: 'ri-building-line', colorVariant: 'primary' },
            { title: 'Partner Clients', count: stats.partner_borrowers || 0, icon: 'ri-team-line', colorVariant: 'warning' },
            active,
        ];
    }

    return [
        total,
        active,
        { title: 'Inactive Clients', count: stats.inactive_borrowers || 0, icon: 'ri-user-unfollow-line', colorVariant: 'secondary' },
        { title: 'Suspended Clients', count: stats.suspended_borrowers || 0, icon: 'ri-user-forbid-line', colorVariant: 'danger' },
    ];
}

const ClientStats: React.FC<ClientStatsProps> = ({ isHost, stats, isLoading }) => {
    if (isLoading || !stats) {
        return (
            <div className="row client-section">
                {[1, 2, 3, 4].map((index) => (
                    <StatisticsCardSkeleton key={`skeleton-${index}`} colSize="col-xl-3 col-md-6" />
                ))}
            </div>
        );
    }

    // These always come straight from the (partner-scoped) API totals — they must NOT be
    // overridden by the table's current search/filter/pagination state, or the cards would
    // show misleading counts (e.g. "Active Clients" dropping to match a search filter).
    return (
        <div className="row client-section">
            {clientCards(isHost, stats).map((config) => (
                <StatisticsCard
                    key={config.title}
                    title={config.title}
                    count={config.count}
                    icon={config.icon}
                    colorVariant={config.colorVariant}
                    colSize="col-xl-3 col-md-6"
                />
            ))}
        </div>
    );
};

export default ClientStats;
