import React from 'react';
import StatisticsCard from '../../../components/Common/StatisticsCard';

export default function InvoiceStats({ stats }) {
    const statCards = [
        {
            title: 'Invoices Sent',
            value: stats?.data?.invoices_sent ? `$${stats.data.invoices_sent.toLocaleString()}` : '$0',
            icon: 'ri-file-list-3-line',
            colorVariant: 'primary'
        },
        {
            title: 'Paid Invoices',
            value: stats?.data?.paid_invoices ? `$${stats.data.paid_invoices.toLocaleString()}` : '$0',
            icon: 'ri-checkbox-circle-line',
            colorVariant: 'success'
        },
        {
            title: 'Unpaid Invoices',
            value: stats?.data?.unpaid_invoices ? `$${stats.data.unpaid_invoices.toLocaleString()}` : '$0',
            icon: 'ri-close-circle-line',
            colorVariant: 'danger'
        },
        {
            title: 'Collection Rate',
            value: stats?.data?.collection_rate ? `${stats.data.collection_rate}%` : '0%',
            icon: 'ri-bar-chart-line',
            colorVariant: 'info'
        }
    ];

    return (
        <div className="row g-4 mt-1">
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
