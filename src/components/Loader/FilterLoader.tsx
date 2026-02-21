import React from 'react';

interface FilterLoaderConfig {
    col: string;
    isButton?: boolean;
}

interface FilterLoaderProps {
    config?: FilterLoaderConfig[];
}

export default function FilterLoader({ config = [] }: FilterLoaderProps) {
    // Default config if none provided (legacy compatibility or default)
    const defaultConfig = [
        { col: 'col-xxl-3 col-sm-6' }, // Search
        { col: 'col-xxl-2 col-sm-6' }, // Dropdown 1
        { col: 'col-xxl-2 col-sm-6' }, // Dropdown 2
        { col: 'col-xxl-2 col-sm-6' }, // Dropdown 3
        { col: 'col-xxl-3 col-sm-12', isButton: true } // Buttons
    ];

    const displayConfig = config.length > 0 ? config : defaultConfig;

    return (
        <div className="row g-3 fade-panel mb-3">
            {displayConfig.map((item, index) => (
                <div key={index} className={item.col}>
                    {item.isButton ? (
                        <div className="d-flex gap-2">
                            <div className="skeleton-line flex-grow-1 skeleton-filter-item"></div>
                            <div className="skeleton-line flex-grow-1 skeleton-filter-item"></div>
                        </div>
                    ) : (
                        <div className="skeleton-line w-100 skeleton-filter-item"></div>
                    )}
                </div>
            ))}
        </div>
    );
}
