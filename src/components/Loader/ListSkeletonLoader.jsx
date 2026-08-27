import React from 'react';
import { Skeleton } from 'primereact/skeleton';
import StatisticsCardSkeleton from '../Common/StatisticsCardSkeleton';

export default function ListSkeletonLoader({ showCards = false }) {
    return (
        <>
            {/* Stats Cards Skeleton */}
            {showCards && (
                <div className="row">
                    {[1, 2, 3, 4].map(i => (
                        <StatisticsCardSkeleton key={i} />
                    ))}
                </div>
            )}

            {/* Table Card Skeleton */}
            <div className="row row-table-fit">
                <div className="col-lg-12">
                    <div className="card">
                        <div className="card-body list-fluid-card p-4">
                            {/* Toolbar skeleton */}
                            <div className="d-flex justify-content-between mb-3">
                                <div className="d-flex gap-2">
                                    <Skeleton className="sk-w-150 sk-h-2_5rem sk-rounded"></Skeleton>
                                    <Skeleton className="sk-w-150 sk-h-2_5rem sk-rounded"></Skeleton>
                                </div>
                                <Skeleton className="sk-w-200 sk-h-2_5rem sk-rounded"></Skeleton>
                            </div>
                            
                            {/* Table skeleton */}
                            <div className="table-responsive">
                                <table className="table table-borderless table-nowrap align-middle">
                                    <thead>
                                        <tr>
                                            {[1, 2, 3, 4, 5, 6].map(i => (
                                                <th key={`th-${i}`}><Skeleton className="sk-w-100p sk-h-1rem"></Skeleton></th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {[1, 2, 3, 4, 5, 6, 7].map(row => (
                                            <tr key={`tr-${row}`}>
                                                {[1, 2, 3, 4, 5, 6].map(col => (
                                                    <td key={`td-${row}-${col}`}>
                                                        <Skeleton className="sk-w-100p sk-h-1rem"></Skeleton>
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
