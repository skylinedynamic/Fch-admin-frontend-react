import React from 'react';
import StatisticsCard from '../../../components/Common/StatisticsCard';
import StatisticsCardSkeleton from '../../../components/Common/StatisticsCardSkeleton';

/**
 * Top-of-page totals for Upcoming Billings.
 *
 * These are computed across the whole filtered set on the server, not the current
 * page — a per-page total would be meaningless for deciding what to chase.
 */
export default function BillingStats({ summary, loading }) {
    if (loading && !summary) {
        return (
            <div className="row invoice-section">
                <StatisticsCardSkeleton />
                <StatisticsCardSkeleton />
                <StatisticsCardSkeleton />
            </div>
        );
    }

    const money = (value) =>
        `$${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const statCards = [
        {
            // What the cron will actually charge on the next cycle.
            title: 'Scheduled to Collect',
            value: money(summary?.scheduled_total),
            icon: 'ri-calendar-check-line',
            colorVariant: 'success'
        },
        {
            // Everything already invoiced and still unpaid.
            title: 'Outstanding',
            value: money(summary?.outstanding_total),
            icon: 'ri-money-dollar-circle-line',
            colorVariant: 'info'
        },
        {
            // The subset of Outstanding that nothing will collect, because the
            // subscriber is not Active. This is the number that was invisible.
            title: 'Not Collectable (Paused)',
            value: money(summary?.paused_outstanding_total),
            icon: 'ri-pause-circle-line',
            colorVariant: 'warning'
        }
    ];

    return (
        <div className="row invoice-section">
            {statCards.map((card, index) => (
                <StatisticsCard
                    key={`billing-stat-${index}`}
                    title={card.title}
                    count={card.value}
                    icon={card.icon}
                    colorVariant={card.colorVariant}
                    colSize="col-xl-4 col-md-6"
                />
            ))}
        </div>
    );
}
