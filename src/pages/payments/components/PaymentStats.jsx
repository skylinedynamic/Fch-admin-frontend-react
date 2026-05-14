import React from 'react';
import StatisticsCard from '../../../components/Common/StatisticsCard';
import StatisticsCardSkeleton from '../../../components/Common/StatisticsCardSkeleton';

export default function PaymentStats({ stats, loading }) {
    const config = [
        {
            title: "Total Transactions",
            dataKey: "total_payments",
            icon: "ri-money-dollar-circle-line",
            colorVariant: "primary",
            isAmount: true
        },
        {
            title: "Total Paid",
            dataKey: "completed",
            icon: "ri-checkbox-circle-line",
            colorVariant: "success",
            isAmount: true
        },
        {
            title: "Total Pending",
            dataKey: "pending",
            icon: "ri-time-line",
            colorVariant: "info",
            isAmount: false
        },
        {
            title: "Total Failed",
            dataKey: "failed",
            icon: "ri-close-circle-line",
            colorVariant: "danger",
            isAmount: false
        }
    ];

    if (loading && !stats) {
        return (
            <div className="row payment-section">
                {config.map((_, index) => (
                    <StatisticsCardSkeleton key={`skeleton-${index}`} />
                ))}
            </div>
        );
    }

    return (
        <div className="row payment-section">
            {config.map((item, index) => (
                <StatisticsCard
                    key={`stat-${index}`}
                    title={item.title}
                    count={item.isAmount ? `$${Number(stats[item.dataKey] || 0).toLocaleString()}` : (stats[item.dataKey] || 0)}
                    icon={item.icon}
                    colorVariant={item.colorVariant}
                />
            ))}
        </div>
    );
}
