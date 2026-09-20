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

const ClientStats: React.FC<ClientStatsProps> = ({ stats, isLoading }) => {
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
    const derivedStats = {
        active_count: stats?.active_borrowers || 0,
        new_this_month: stats?.new_this_month || 0,
        total_clients: stats?.total_borrowers || 0,
        inactive_count: stats?.inactive_borrowers || 0
    };

    const statisticsConfig = [
        {
            title: "Active Clients",
            count: derivedStats.active_count,
            icon: "ri-user-line",
            colorVariant: "primary"
        },
        {
            title: "New This Month",
            count: derivedStats.new_this_month,
            icon: "ri-user-add-line",
            colorVariant: "warning"
        },
        {
            title: "Total Clients",
            count: derivedStats.total_clients,
            icon: "ri-group-line",
            colorVariant: "info"
        },
        {
            title: "Inactive Clients",
            count: derivedStats.inactive_count,
            icon: "ri-user-unfollow-line",
            colorVariant: "danger"
        }
    ];

    return (
        <div className="row client-section">
            {statisticsConfig.map((config, index) => (
                <StatisticsCard
                    key={`stat-${index}`}
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

