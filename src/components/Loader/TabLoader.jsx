import React from 'react'
import './SkeletonLoader.css'

export default function TabLoader({ count = 12, colClass = 'col-md-6' }) {
    const defaultWidths = ['30%', '28%', '20%', '38%', '25%', '18%', '20%', '28%', '35%', '32%', '33%', '28%']

    // Create an array of length 'count', cycling through defaultWidths
    const items = Array.from({ length: count }).map((_, i) => defaultWidths[i % defaultWidths.length])

    return (
        <div className="fade-panel">
            <div className="row g-3">
                {items.map((width, i) => (
                    <div className={colClass} key={i}>
                        <div className="mb-2">
                            <div className="skeleton-line" style={{ width: width, height: 14, borderRadius: 4 }}></div>
                        </div>
                        <div className="skeleton-line w-100" style={{ height: 42, borderRadius: 8 }}></div>
                    </div>
                ))}

                <div className="col-12 d-flex justify-content-end mt-4">
                    <div className="skeleton-line" style={{ width: 120, height: 38, borderRadius: 10 }}></div>
                </div>
            </div>
        </div>
    )
}
