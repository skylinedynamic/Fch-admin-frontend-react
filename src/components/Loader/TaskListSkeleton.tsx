import React from 'react';


const TaskListSkeleton: React.FC = () => {
    return (
        <div className="task-list-container py-2">
            {/* Minimized Program Progress Summary Skeleton */}
            <div className="card shadow-none border-0 bg-light rounded-2 overflow-hidden mb-3">
                <div className="card-body p-3">
                    <div className="d-flex align-items-center justify-content-between mb-2">
                        <div className="d-flex align-items-center">
                            <div className="skeleton-line" style={{ width: '120px', height: '18px', marginRight: '8px' }}></div>
                            <div className="skeleton-line" style={{ width: '180px', height: '18px' }}></div>
                        </div>
                        <div className="d-flex align-items-center">
                            <div className="skeleton-line" style={{ width: '80px', height: '14px', marginRight: '8px' }}></div>
                            <div className="skeleton-line" style={{ width: '40px', height: '22px' }}></div>
                        </div>
                    </div>

                    <div className="progress shadow-none bg-white mb-2" style={{ height: '4px', borderRadius: '3px' }}>
                        <div className="skeleton-line w-100 h-100" style={{ borderRadius: '3px' }}></div>
                    </div>

                    <div className="d-flex justify-content-between align-items-center">
                        <div className="d-flex align-items-center">
                            <div className="skeleton-line" style={{ width: '14px', height: '14px', marginRight: '8px' }}></div>
                            <div className="skeleton-line" style={{ width: '140px', height: '14px' }}></div>
                        </div>
                        <div className="skeleton-line" style={{ width: '220px', height: '12px' }}></div>
                    </div>
                </div>
            </div>

            {/* Actions and Dropdown Skeleton */}
            <div className="d-flex justify-content-between align-items-center mt-4 mb-3">
                <div className="d-flex gap-2">
                    <div className="skeleton-line" style={{ width: '110px', height: '32px' }}></div>
                    <div className="skeleton-line" style={{ width: '120px', height: '32px' }}></div>
                </div>
            </div>

            {/* Task list items skeleton */}
            <div className="list-group list-group-flush border-dashed mt-3">
                {[1, 2, 3, 4, 5].map((item) => (
                    <div key={item} className="list-group-item d-flex align-items-center py-3 px-0 border-bottom">
                        <div className="flex-shrink-0 me-3">
                            <div className="skeleton-line" style={{ width: '20px', height: '20px' }}></div>
                        </div>
                        <div className="flex-grow-1">
                            <div className="skeleton-line" style={{ width: '65%', height: '16px' }}></div>
                        </div>
                        <div className="flex-shrink-0">
                            <div className="skeleton-line" style={{ width: '100px', height: '32px' }}></div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default TaskListSkeleton;
