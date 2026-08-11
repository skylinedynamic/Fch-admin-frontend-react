import React from 'react';
import StatisticsCard from '../../../components/Common/StatisticsCard';
import StatisticsCardSkeleton from '../../../components/Common/StatisticsCardSkeleton';

export default function PaymentStats({ stats, loading }) {
    const getVal = (val) => {
        if (val == null) return '$0';
        if (typeof val === 'string' && val.startsWith('$')) return val;
        return `$${Number(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const config = [
        {
            title: "Total Transactions",
            dataKey: "total_payments",
            icon: "ri-money-dollar-circle-line",
            colorVariant: "primary"
        },
        {
            title: "Total Paid",
            dataKey: "completed",
            icon: "ri-checkbox-circle-line",
            colorVariant: "success"
        },
        {
            title: "Total Pending",
            dataKey: "pending",
            icon: "ri-time-line",
            colorVariant: "info"
        },
        {
            title: "Total Processing",
            dataKey: "processing",
            icon: "ri-refresh-line",
            colorVariant: "warning"
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
                    count={getVal(stats?.[item.dataKey] ?? stats?.data?.[item.dataKey])}
                    icon={item.icon}
                    colorVariant={item.colorVariant}
                />
            ))}
        </div>
    );
}
