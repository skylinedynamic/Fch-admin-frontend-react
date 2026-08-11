import React from 'react';
import StatisticsCard from '../../../components/Common/StatisticsCard';
import StatisticsCardSkeleton from '../../../components/Common/StatisticsCardSkeleton';

export default function InvoiceStats({ stats, loading }) {
    if (loading && !stats) {
        return (
            <div className="row invoice-section">
                <StatisticsCardSkeleton />
                <StatisticsCardSkeleton />
                <StatisticsCardSkeleton />
                <StatisticsCardSkeleton />
            </div>
        );
    }

    const getVal = (val, isRate = false) => {
        if (val == null) return isRate ? '0%' : '$0';
        if (typeof val === 'string' && (val.startsWith('$') || val.endsWith('%'))) return val;
        return isRate ? `${val}%` : `$${Number(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const statCards = [
        {
            title: 'Invoices Sent',
            value: getVal(stats?.invoices_sent ?? stats?.data?.invoices_sent),
            icon: 'ri-file-list-3-line',
            colorVariant: 'primary'
        },
        {
            title: 'Paid Invoices',
            value: getVal(stats?.paid_invoices ?? stats?.data?.paid_invoices),
            icon: 'ri-checkbox-circle-line',
            colorVariant: 'success'
        },
        {
            title: 'Unpaid Invoices',
            value: getVal(stats?.unpaid_invoices ?? stats?.data?.unpaid_invoices),
            icon: 'ri-close-circle-line',
            colorVariant: 'danger'
        },
        {
            title: 'Collection Rate',
            value: getVal(stats?.collection_rate ?? stats?.data?.collection_rate, true),
            icon: 'ri-bar-chart-line',
            colorVariant: 'info'
        }
    ];

    return (
        <div className="row invoice-section">
            {statCards.map((card, index) => (
                <StatisticsCard
                    key={`stat-${index}`}
                    title={card.title}
                    count={card.value}
                    icon={card.icon}
                    colorVariant={card.colorVariant}
                />
            ))}
        </div>
    );
}
