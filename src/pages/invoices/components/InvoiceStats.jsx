import React from 'react';
import StatisticsCard from '../../../components/Common/StatisticsCard';

export default function InvoiceStats({ stats }) {
    const statCards = [
        {
            title: 'Invoices Sent',
            value: stats?.total_invoices_sent || '$3,425',
            icon: 'ri-file-list-3-line',
            colorVariant: 'primary'
        },
        {
            title: 'Paid Invoices',
            value: stats?.total_paid || '$2,222',
            icon: 'ri-checkbox-circle-line',
            colorVariant: 'success'
        },
        {
            title: 'Unpaid Invoices',
            value: stats?.total_unpaid || '$3,438',
            icon: 'ri-close-circle-line',
            colorVariant: 'danger'
        },
        {
            title: 'Collection Rate',
            value: stats?.collection_rate || '4%',
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
