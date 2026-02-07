import React from 'react';
import { useSubscriptionStats } from '../../../modules/partner/queries';
import StatisticsCard from '../../../components/Common/StatisticsCard';
import StatisticsCardSkeleton from '../../../components/Common/StatisticsCardSkeleton';
import { SubscriptionStats as SubscriptionStatsType } from '../../../modules/partner/types';

interface StatisticsConfig {
    title: string;
    dataKey: keyof SubscriptionStatsType;
    icon: string;
    colorVariant: string;
    isAmount?: boolean;
}

const SubscriptionStats: React.FC = () => {
    // Fetch stats
    const { data: statsData, isLoading: statsLoading } = useSubscriptionStats();

    // The API response structure is { status: true, message: "...", data: { ... } }
    const stats = statsData?.data;

    const statisticsConfig: StatisticsConfig[] = [
        {
            title: "Total Subscribers",
            dataKey: "total_subscriptions",
            icon: "ri-user-line",
            colorVariant: "primary"
        },
        {
            title: "Active Subscriptions",
            dataKey: "active_subscriptions",
            icon: "ri-checkbox-circle-line",
            colorVariant: "warning",
            isAmount: true // Matching $ in screenshot
        },
        {
            title: "Expiring Soon",
            dataKey: "expiring_soon",
            icon: "ri-history-line",
            colorVariant: "info"
        },
        {
            title: "Revenue (This Month)",
            dataKey: "revenue_this_month",
            icon: "ri-money-dollar-circle-line",
            colorVariant: "success",
            isAmount: true
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
            {statisticsConfig.map((config, index) => {
                const value = stats?.[config.dataKey] || 0;
                const displayValue = config.isAmount
                    ? `$${Number(value).toLocaleString()}`
                    : value;

                return (
                    <StatisticsCard
                        key={`stat-${index}`}
                        title={config.title}
                        count={displayValue}
                        icon={config.icon}
                        colorVariant={config.colorVariant}
                    />
                );
            })}
        </div>
    );
};

export default SubscriptionStats;
