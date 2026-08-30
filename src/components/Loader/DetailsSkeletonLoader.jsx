import React from 'react';
import { Skeleton } from 'primereact/skeleton';

export default function DetailsSkeletonLoader() {
    return (
        <div className="row">
            <div className="col-xxl-12">
                <div className="card border-0 shadow-sm overflow-hidden">
                    <div className="card-header bg-white p-4">
                        <div className="d-flex align-items-center">
                            <Skeleton shape="circle" size="3rem" className="me-3"></Skeleton>
                            <div className="flex-grow-1">
                                <Skeleton className="sk-w-40p sk-h-1_5rem mb-2"></Skeleton>
                                <Skeleton className="sk-w-20p sk-h-1rem"></Skeleton>
                            </div>
                            <div className="text-end">
                                <Skeleton className="sk-w-100 sk-h-2rem mb-2 ms-auto"></Skeleton>
                                <Skeleton className="sk-w-60 sk-h-1_5rem ms-auto"></Skeleton>
                            </div>
                        </div>
                    </div>
                    <div className="card-body p-4 border-bottom border-bottom-dashed">
                        <div className="row g-4">
                            <div className="col-lg-6 col-md-6">
                                <Skeleton className="sk-w-150 sk-h-1_5rem mb-3"></Skeleton>
                                <Skeleton className="sk-w-60p sk-h-1rem mb-2"></Skeleton>
                                <Skeleton className="sk-w-50p sk-h-1rem"></Skeleton>
                            </div>
                            <div className="col-lg-6 col-md-6">
                                <Skeleton className="sk-w-150 sk-h-1_5rem mb-3"></Skeleton>
                                <Skeleton className="sk-w-70p sk-h-1rem mb-2"></Skeleton>
                                <Skeleton className="sk-w-60p sk-h-1rem mb-2"></Skeleton>
                                <Skeleton className="sk-w-50p sk-h-1rem"></Skeleton>
                            </div>
                        </div>
                    </div>
                    <div className="card-body p-4">
                        <Skeleton className="sk-w-100p sk-h-200px"></Skeleton>
                    </div>
                </div>
            </div>
        </div>
    );
}
