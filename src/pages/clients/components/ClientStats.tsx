import React from 'react';
import { useClientListStats } from '../../../modules/client/queries';
import StatisticsCard from '../../../components/Common/StatisticsCard';
import StatisticsCardSkeleton from '../../../components/Common/StatisticsCardSkeleton';

interface ClientStatsData {
    active_count: number;
    new_this_month: number;
    total_clients: number;
    inactive_count: number;
    [key: string]: number;
}

interface StatisticsConfig {
    title: string;
    dataKey: keyof ClientStatsData;
    icon: string;
    colorVariant: string;
}

interface ClientStatsProps {
    isHost: boolean;
    partnerId?: string | number;
    filteredTotal?: number;
}

const ClientStats: React.FC<ClientStatsProps> = ({ isHost, partnerId, filteredTotal }) => {
    // Fetch stats
    const { data: statsData, isLoading: statsLoading } = useClientListStats(isHost ? undefined : partnerId);

    // Derived Stats
    const derivedStats: ClientStatsData = {
        active_count: statsData?.data?.active_count || 0,
        new_this_month: statsData?.data?.new_this_month || 0,
        total_clients: statsData?.data?.total_borrowers || 0,
        inactive_count: statsData?.data?.inactive_count || 0
    };

    // Use filtered total if provided, otherwise use fetched total
    const finalStats: ClientStatsData = {
        ...derivedStats,
        total_clients: filteredTotal !== undefined ? filteredTotal : derivedStats.total_clients
    };

    const statisticsConfig: StatisticsConfig[] = [
        {
            title: "Active Clients",
            dataKey: "active_count",
            icon: "ri-user-line",
            colorVariant: "primary"
        },
        {
            title: "New This Month",
            dataKey: "new_this_month",
            icon: "ri-user-add-line",
            colorVariant: "warning"
        },
        {
            title: "Total Clients",
            dataKey: "total_clients",
            icon: "ri-group-line",
            colorVariant: "info"
        },
        {
            title: "Inactive",
            dataKey: "inactive_count",
            icon: "ri-user-unfollow-line",
            colorVariant: "success"
        }
    ];

    if (statsLoading) {
        return (
            <div className="row">
                {statisticsConfig.map((_, index) => (
                    <StatisticsCardSkeleton key={`skeleton-${index}`} />
                ))}
            </div>
        );
    }

    return (
        <div className="row">
            {statisticsConfig.map((config, index) => (
                <StatisticsCard
                    key={`stat-${index}`}
                    title={config.title}
                    count={finalStats[config.dataKey] || 0}
                    icon={config.icon}
                    colorVariant={config.colorVariant}
                />
            ))}
        </div>
    );
};

export default ClientStats;
