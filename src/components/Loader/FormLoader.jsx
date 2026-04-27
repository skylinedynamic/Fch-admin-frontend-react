import React from 'react'

export default function FormLoader({ count = 12, colClass = 'col-md-6' }) {
    const defaultWidths = ['30%', '28%', '20%', '38%', '25%', '18%', '20%', '28%', '35%', '32%', '33%', '28%']

    // Create an array of length 'count', cycling through defaultWidths
    const items = Array.from({ length: count }).map((_, i) => defaultWidths[i % defaultWidths.length])

    return (
        <div className="fade-panel h-100">
            <div className="card shadow-sm border-0">
                <div className="card-header border-bottom-dashed py-3 px-4">
                    <div className="skeleton-line" style={{ width: '220px', height: '18px', borderRadius: 4 }}></div>
                </div>
                <div className="card-body p-4">
                    <div className="row g-4">
                        {items.map((width, i) => (
                            <div className={colClass} key={i}>
                                <div className="mb-2">
                                    <div className="skeleton-line" style={{ width: width, height: 14, borderRadius: 4 }}></div>
                                </div>
                                <div className="skeleton-line w-100" style={{ height: 38, borderRadius: 6 }}></div>
                            </div>
                        ))}

                        <div className="col-12 d-flex justify-content-end mt-4 pt-3 border-top">
                            <div className="skeleton-line" style={{ width: 140, height: 38, borderRadius: 6 }}></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
