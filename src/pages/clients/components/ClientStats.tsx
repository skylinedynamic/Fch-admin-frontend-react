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

const ClientStats: React.FC<ClientStatsProps> = ({ stats, filteredTotal, isLoading }) => {
    if (isLoading || !stats) {
        return (
            <div className="row">
                {[1, 2, 3, 4].map((index) => (
                    <StatisticsCardSkeleton key={`skeleton-${index}`} />
                ))}
            </div>
        );
    }

    // Derived Stats
    const derivedStats = {
        active_count: stats?.active_borrowers || 0,
        new_this_month: stats?.new_this_month || 0,
        total_clients: stats?.total_borrowers || 0,
        inactive_count: stats?.inactive_borrowers || 0
    };

    // Use filtered total if provided, otherwise use fetched total
    const finalStats = {
        ...derivedStats,
        total_clients: filteredTotal !== undefined ? filteredTotal : derivedStats.total_clients
    };

    const statisticsConfig = [
        {
            title: "Active Clients",
            count: finalStats.active_count,
            icon: "ri-user-line",
            colorVariant: "primary"
        },
        {
            title: "New This Month",
            count: finalStats.new_this_month,
            icon: "ri-user-add-line",
            colorVariant: "warning"
        },
        {
            title: "Total Clients",
            count: finalStats.total_clients,
            icon: "ri-group-line",
            colorVariant: "info"
        },
        {
            title: "Inactive Clients",
            count: finalStats.inactive_count,
            icon: "ri-user-unfollow-line",
            colorVariant: "danger"
        }
    ];

    return (
        <div className="row">
            {statisticsConfig.map((config, index) => (
                <StatisticsCard
                    key={`stat-${index}`}
                    title={config.title}
                    count={config.count}
                    icon={config.icon}
                    colorVariant={config.colorVariant}
                />
            ))}
        </div>
    );
};

export default ClientStats;

