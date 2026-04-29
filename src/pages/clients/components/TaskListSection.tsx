import React, { useState } from 'react';
import { useBorrowerTiers } from '../../../modules/client';

interface TaskItem {
    id: string;
    title: string;
    isVerified: boolean;
}

const INITIAL_TASKS: TaskItem[] = [
    { id: '1', title: 'EIN Consistency & Identity Verification', isVerified: false },
    { id: '2', title: 'Business Address Verification', isVerified: false },
    { id: '3', title: 'Business Phone & Directory Listing', isVerified: false },
    { id: '4', title: 'Website & Professional Email Presence', isVerified: false },
    { id: '5', title: 'Business Banking Presence', isVerified: false },
    { id: '6', title: 'D-U-N-S Number (Existence Check)', isVerified: false },
    { id: '7', title: 'Business Identity Match', isVerified: false },
    { id: '8', title: 'Active Legal Entity Status', isVerified: false },
];

export default function TaskListSection({ clientId }: { clientId?: string | null }) {
    const [tasks, setTasks] = useState<TaskItem[]>(INITIAL_TASKS);
    const { data: tiers = [] } = useBorrowerTiers();
    const [selectedTier, setSelectedTier] = useState<string>('');

    const toggleVerify = (id: string) => {
        setTasks(prev => prev.map(task =>
            task.id === id ? { ...task, isVerified: !task.isVerified } : task
        ));
    };

    const bulkAction = (verified: boolean) => {
        setTasks(prev => prev.map(task => ({ ...task, isVerified: verified })));
    };

    return (
        <div className="task-list-container py-2">
            <div className="d-flex justify-content-between align-items-center">
                <div className="d-flex gap-2">
                    <div className="dropdown">
                        <button
                            className="btn btn-soft-primary btn-sm dropdown-toggle shadow-none"
                            type="button"
                            data-bs-toggle="dropdown"
                            aria-expanded="false"
                        >
                            {selectedTier || 'Select Tier'}
                        </button>
                        <ul className="dropdown-menu dropdown-menu-end shadow-lg border-0 mt-2">
                            {tiers.map((tier: any) => (
                                <li key={tier.value}>
                                    <a
                                        className="dropdown-item"
                                        href="#"
                                        onClick={(e) => { e.preventDefault(); setSelectedTier(tier.label); }}
                                    >
                                        {tier.label}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div className="dropdown">
                        <button
                            className="btn btn-soft-info btn-sm dropdown-toggle shadow-none"
                            type="button"
                            data-bs-toggle="dropdown"
                            aria-expanded="false"
                        >
                            Bulk Actions
                        </button>
                        <ul className="dropdown-menu dropdown-menu-end shadow-lg border-0 mt-2">
                            <li>
                                <a
                                    className="dropdown-item d-flex align-items-center"
                                    href="#"
                                    onClick={(e) => { e.preventDefault(); bulkAction(true); }}
                                >
                                    <i className="ri-check-double-line me-2 text-success"></i> Bulk Verification
                                </a>
                            </li>
                            <li>
                                <a
                                    className="dropdown-item d-flex align-items-center"
                                    href="#"
                                    onClick={(e) => { e.preventDefault(); bulkAction(false); }}
                                >
                                    <i className="ri-close-circle-line me-2 text-danger"></i> Bulk Rejection
                                </a>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
            <div className="list-group list-group-flush border-dashed">
                {tasks.map((task) => (
                    <div key={task.id} className="list-group-item d-flex align-items-center py-3 px-0 border-bottom">
                        <div className="flex-shrink-0 me-3">
                            <div className="form-check fs-18">
                                <input
                                    className="form-check-input border-2"
                                    type="checkbox"
                                    checked={task.isVerified}
                                    onChange={() => toggleVerify(task.id)}
                                    id={`task-${task.id}`}
                                    style={{ cursor: 'pointer', width: '20px', height: '20px' }}
                                />
                            </div>
                        </div>
                        <div className="flex-grow-1">
                            <label
                                htmlFor={`task-${task.id}`}
                                className={`fs-15 mb-0 fw-medium ${task.isVerified ? 'text-success' : 'text-dark'}`}
                                style={{ cursor: 'pointer' }}
                            >
                                {task.title}
                            </label>
                        </div>
                        <div className="flex-shrink-0">
                            <button
                                type="button"
                                className={`btn btn-sm ${task.isVerified ? 'btn-success' : 'btn-primary'} w-md shadow-none`}
                                onClick={() => toggleVerify(task.id)}
                                style={{ minWidth: '100px' }}
                            >
                                {task.isVerified ? (
                                    <>
                                        <i className="ri-check-line align-bottom me-1"></i> Verified
                                    </>
                                ) : (
                                    'Verify'
                                )}
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
