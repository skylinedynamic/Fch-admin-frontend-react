import React from 'react';

const LenderMatchStats = ({ review }: { review?: any }) => {
    // Dummy stats matching the visual design. 
    // You can replace these with your actual logic.
    const totalLenders = 12;
    const perfectCount = 5;
    const perfectPct = 41.7;
    const partialCount = 6;
    const partialPct = 50.0;
    const noMatchCount = 1;
    const noMatchPct = 8.3;
    const avgScore = 72;
    
    // SVG Circular Progress helper component
    const CircleProgress = ({ percentage, colorHex }: { percentage: number, colorHex: string }) => {
        const radius = 18;
        const circumference = 2 * Math.PI * radius;
        const strokeDashoffset = circumference - (percentage / 100) * circumference;
        
        return (
            <div className="d-inline-flex align-items-center justify-content-center position-relative" style={{ width: '48px', height: '48px' }}>
                <svg width="48" height="48">
                    <circle cx="24" cy="24" r={radius} stroke="#f1f5f9" strokeWidth="4" fill="none" />
                    <circle cx="24" cy="24" r={radius} stroke={colorHex} strokeWidth="4" fill="none" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }} />
                </svg>
                <span className="position-absolute fs-10 fw-bold text-dark" style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
                    {percentage}%
                </span>
            </div>
        );
    };

    return (
        <div className="row mb-4">
            <div className="col-xl-3 col-md-6 mb-3 mb-xl-0">
                <div className="card card-animate h-100 shadow-sm border-0">
                    <div className="card-body">
                        <div className="d-flex align-items-center">
                            <div className="avatar-sm flex-shrink-0">
                                <span className="avatar-title bg-primary-subtle text-primary rounded-2 fs-2">
                                    <i className="ri-team-fill text-primary" aria-hidden="true"></i>
                                </span>
                            </div>
                            <div className="flex-grow-1 overflow-hidden ms-3">
                                <p className="text-capitalize fw-medium text-muted text-truncate mb-1 kpi-title">
                                    Total Lenders
                                </p>
                                <div className="d-flex align-items-center mb-1">
                                    <h4 className="fs-4 flex-grow-1 mb-0">
                                        <span className="counter-value">{totalLenders}</span>
                                    </h4>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="col-xl-3 col-md-6 mb-3 mb-xl-0">
                <div className="card card-animate h-100 shadow-sm border-0">
                    <div className="card-body">
                        <div className="d-flex align-items-center">
                            <div className="avatar-sm flex-shrink-0 d-flex justify-content-center align-items-center">
                                <CircleProgress percentage={perfectPct} colorHex="#059669" />
                            </div>
                            <div className="flex-grow-1 overflow-hidden ms-3">
                                <p className="text-capitalize fw-medium text-muted text-truncate mb-1 kpi-title">
                                    Perfect Matches (6+)
                                </p>
                                <div className="d-flex align-items-center mb-1">
                                    <h4 className="fs-4 flex-grow-1 mb-0 text-success">
                                        <span className="counter-value">{perfectCount}</span>
                                    </h4>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="col-xl-3 col-md-6 mb-3 mb-xl-0">
                <div className="card card-animate h-100 shadow-sm border-0">
                    <div className="card-body">
                        <div className="d-flex align-items-center">
                            <div className="avatar-sm flex-shrink-0 d-flex justify-content-center align-items-center">
                                <CircleProgress percentage={partialPct} colorHex="#f59e0b" />
                            </div>
                            <div className="flex-grow-1 overflow-hidden ms-3">
                                <p className="text-capitalize fw-medium text-muted text-truncate mb-1 kpi-title">
                                    Partial Matches (1-5)
                                </p>
                                <div className="d-flex align-items-center mb-1">
                                    <h4 className="fs-4 flex-grow-1 mb-0 text-warning">
                                        <span className="counter-value">{partialCount}</span>
                                    </h4>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="col-xl-3 col-md-6 mb-3 mb-xl-0">
                <div className="card card-animate h-100 shadow-sm border-0">
                    <div className="card-body">
                        <div className="d-flex align-items-center">
                            <div className="avatar-sm flex-shrink-0 d-flex justify-content-center align-items-center">
                                <CircleProgress percentage={avgScore} colorHex="#0f172a" />
                            </div>
                            <div className="flex-grow-1 overflow-hidden ms-3">
                                <p className="text-capitalize fw-medium text-muted text-truncate mb-1 kpi-title">
                                    Avg. Match Score
                                </p>
                                <div className="d-flex align-items-center mb-1">
                                    <h4 className="fs-4 flex-grow-1 mb-0 text-dark">
                                        <span className="counter-value">{avgScore}%</span>
                                    </h4>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
        </div>
    );
};

export default LenderMatchStats;
