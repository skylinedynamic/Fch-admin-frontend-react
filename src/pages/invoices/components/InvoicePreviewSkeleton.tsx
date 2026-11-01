/** Placeholder in the invoice preview's own layout while its details load. */
export default function InvoicePreviewSkeleton() {
    return (
        <div className="card shadow-none mb-0" role="status" aria-label="Loading invoice" aria-busy="true">
            <div className="row p-2">
                <div className="col-lg-12">
                    <div className="card-header border-bottom-dashed p-4">
                        <div className="d-flex flex-column flex-sm-row align-items-center">
                            <div className="flex-grow-1">
                                <div className="skeleton-line" style={{ width: '200px', height: '60px' }}></div>
                            </div>
                            <div className="flex-shrink-0 mt-sm-0 mt-4 text-center text-sm-end">
                                <div className="skeleton-line mb-2" style={{ width: '120px', height: '16px' }}></div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="col-lg-12 border-top border-top-dashed">
                    <div className="card-body p-4">
                        <div className="row g-3">
                            <div className="col-6">
                                <div className="skeleton-line mb-3" style={{ width: '90px', height: '14px' }}></div>
                                <div className="skeleton-line mb-1" style={{ width: '150px', height: '14px' }}></div>
                                <div className="skeleton-line mb-1" style={{ width: '170px', height: '14px' }}></div>
                                <div className="skeleton-line" style={{ width: '120px', height: '14px' }}></div>
                            </div>
                            <div className="col-6 text-end">
                                <div className="skeleton-line mb-3 ms-auto" style={{ width: '80px', height: '14px' }}></div>
                                <div className="skeleton-line mb-1 ms-auto" style={{ width: '150px', height: '14px' }}></div>
                                <div className="skeleton-line mb-1 ms-auto" style={{ width: '170px', height: '14px' }}></div>
                                <div className="skeleton-line ms-auto" style={{ width: '120px', height: '14px' }}></div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="col-lg-12">
                    <div className="card-body p-sm-4 p-2">
                        <div className="row g-3">
                            {[1, 2, 3, 4].map((i) => (
                                <div className="col-lg-3 col-6" key={i}>
                                    <div className="skeleton-line mb-2" style={{ width: '80px', height: '12px' }}></div>
                                    <div className="skeleton-line" style={{ width: '60px', height: '16px' }}></div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="col-lg-12">
                    <div className="card-body p-4">
                        <div className="skeleton-line mb-3" style={{ width: '100%', height: '40px' }}></div>
                        <div className="skeleton-line mb-2" style={{ width: '100%', height: '30px' }}></div>
                        <div className="border-top border-top-dashed mt-4 pt-3">
                            <div className="skeleton-line ms-auto" style={{ width: '250px', height: '100px' }}></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
