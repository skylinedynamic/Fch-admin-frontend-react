import React, { useState, useEffect, useRef } from 'react';
import { useBorrowerTierWiseTaskList, useBorrowerProgress, useUpdateTaskVerificationStatus } from '../../../modules/client';
import type { BorrowerTier } from '../../../modules/client/types';
import TaskListSkeleton from '../../../components/Loader/TaskListSkeleton';
import { VERIFICATION_STATUS } from '../../../config/creditBuilder';
import VerificationActionModal from '../../credit-builder/components/VerificationActionModal';

interface TaskItem {
    id: string;
    title: string;
    status: string;
    isVerified: boolean;
    logo?: string | null;
    migrated_task_id?: string | number | null;
}

export default function TaskListSection({ clientId }: { clientId?: string | null }) {
    const { data: tiersData = [], isLoading: isTiersLoading } = useBorrowerTierWiseTaskList(clientId || '');
    const { data: progress, isLoading: isProgressLoading } = useBorrowerProgress(clientId || '');

    const isLoading = isTiersLoading || isProgressLoading;
    const [selectedTier, setSelectedTier] = useState<BorrowerTier | null>(null);
    const [tasks, setTasks] = useState<TaskItem[]>([]);
    const [activeTab, setActiveTab] = useState('all');
    const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
    const [modalConfig, setModalConfig] = useState<{
        show: boolean;
        type: 'manual_verify' | 'reject' | '';
        taskId: string | null;
        isBulk: boolean;
    }>({
        show: false,
        type: '',
        taskId: null,
        isBulk: false,
    });
    const manualSelection = useRef(false);

    useEffect(() => {
        if (tiersData.length > 0) {
            // Case 1: Progress is loaded and we have a current tier ID
            if (progress?.id) {
                const activeTier = tiersData.find(t => Number(t.id) === Number(progress.id));
                if (activeTier && (!selectedTier || (!manualSelection.current && selectedTier.id !== activeTier.id))) {
                    setSelectedTier(activeTier);
                }
            }

            // Case 2: Fallback if no matching progress tier yet
            if (!selectedTier && !isProgressLoading) {
                setSelectedTier(tiersData[0]);
            }
        }
    }, [tiersData, progress?.id, isProgressLoading, selectedTier]);

    useEffect(() => {
        if (selectedTier && selectedTier.tasks) {
            setTasks(selectedTier.tasks.map((task) => ({
                id: task.id?.toString(),
                title: task.title,
                status: task.status,
                isVerified: task.status === VERIFICATION_STATUS.COMPLETED,
                logo: task.logo,
                migrated_task_id: task.migrated_task_id,
            })));
        } else {
            setTasks([]);
        }
    }, [selectedTier]);

    const handleSelectTier = (tier: BorrowerTier) => {
        manualSelection.current = true;
        setSelectedTier(tier);
        setSelectedTasks([]);
    };

    const toggleSelectTask = (id: string) => {
        setSelectedTasks(prev =>
            prev.includes(id) ? prev.filter(taskId => taskId !== id) : [...prev, id]
        );
    };

    const verifyMutation = useUpdateTaskVerificationStatus();

    const handleAction = (id: string, isVerify: boolean) => {
        // Local update for immediate feedback (optional, since query invalidation will refetch)
        setTasks(prev => prev.map(task => {
            if (task.id === id) {
                if (task.status === VERIFICATION_STATUS.COMPLETED && !isVerify) return task;
                return {
                    ...task,
                    isVerified: isVerify,
                    status: isVerify ? VERIFICATION_STATUS.COMPLETED : VERIFICATION_STATUS.REJECTED
                };
            }
            return task;
        }));
    };

    const bulkAction = (verified: boolean) => {
        setTasks(prev => prev.map(task => {
            if (selectedTasks.includes(task.id)) {
                if (task.status === VERIFICATION_STATUS.COMPLETED && !verified) return task;
                return {
                    ...task,
                    isVerified: verified,
                    status: verified ? VERIFICATION_STATUS.COMPLETED : VERIFICATION_STATUS.REJECTED
                };
            }
            return task;
        }));
    };

    if (isLoading) {
        return <TaskListSkeleton />;
    }

    const currentTierName = progress?.name || 'N/A';
    const currentTierTitle = progress?.title || '';
    const currentTierDescription = progress?.description || '';
    const currentProgressPercent = progress?.current_tier_complete_percentage || 0;
    const currentTasksVerified = progress?.current_tier_complete_task || 0;
    const currentTasksTotal = (progress?.current_tier_complete_task || 0) + (progress?.current_tier_tasks_remaining || 0);

    const totalTasksVerified = progress?.total_complete_task || 0;
    const totalTasksRemaining = progress?.total_tasks_remaining || 0;
    const totalTasksCount = totalTasksVerified + totalTasksRemaining;
    const totalProgressPercent = progress?.total_complete_percentage || 0;

    const filteredTasks = tasks.filter(task => {
        if (activeTab === 'all') return true;
        if (activeTab === VERIFICATION_STATUS.COMPLETED) return task.status === VERIFICATION_STATUS.COMPLETED;
        if (activeTab === VERIFICATION_STATUS.PENDING) return task.status === VERIFICATION_STATUS.PENDING;
        if (activeTab === VERIFICATION_STATUS.PROCESSING) return task.status === VERIFICATION_STATUS.PROCESSING;
        if (activeTab === VERIFICATION_STATUS.REJECTED) return task.status === VERIFICATION_STATUS.REJECTED;
        return true;
    });

    const counts = {
        all: tasks.length,
        pending: tasks.filter(t => t.status === VERIFICATION_STATUS.PENDING).length,
        processing: tasks.filter(t => t.status === VERIFICATION_STATUS.PROCESSING).length,
        verified: tasks.filter(t => t.status === VERIFICATION_STATUS.COMPLETED).length,
        rejected: tasks.filter(t => t.status === VERIFICATION_STATUS.REJECTED).length,
    };

    return (
        <div className="task-list-container py-2">
            {/* ... Summary Block ... */}
            {progress?.id && (
                <div className="card cb-summary-card">
                    {/* ... (Keep existing summary content) ... */}
                    <div className="card-body">
                        <div className="d-flex align-items-center justify-content-between mb-2">
                            <div className="d-flex align-items-center">
                                <h6 className="cb-summary-title text-muted">
                                    <span>Current Tier:</span>
                                    <span className="ms-1">{currentTierName} - {currentTierTitle}</span>
                                </h6>
                            </div>
                            <div className="d-flex align-items-center">
                                <span className="cb-program-label me-2">Overall Program:</span>
                                <h5 className="cb-progress-percent mb-0">{totalProgressPercent}%</h5>
                            </div>
                        </div>

                        <div className="progress cb-progress-container">
                            <div
                                className="progress-bar bg-success cb-progress-bar"
                                role="progressbar"
                                style={{ width: `${totalProgressPercent}%` }}
                                aria-valuenow={totalProgressPercent}
                                aria-valuemin={0}
                                aria-valuemax={100}
                            ></div>
                        </div>

                        <div className="d-flex justify-content-between align-items-center">
                            <div className="d-flex align-items-center">
                                <i className="ri-medal-fill text-success fs-14 me-1"></i>
                                <span className="text-dark cb-milestone-info">
                                    {totalTasksVerified} <span className="text-muted fw-normal">of {totalTasksCount} completed</span>
                                </span>
                            </div>
                            {currentTierDescription && (
                                <div className="cb-tier-desc-mini">
                                    <i className="ri-information-line me-1"></i>
                                    {currentTierDescription.replace(/<[^>]*>?/gm, '')}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <div className="d-flex justify-content-between align-items-end mt-4 border-bottom">
                {/* Status Tabs */}
                <div className="cb-status-tabs d-flex mb-0 border-bottom-0">
                    <div className={`cb-status-tab ${activeTab === 'all' ? 'active' : ''}`} onClick={() => setActiveTab('all')}>
                        All ({counts.all})
                    </div>
                    <div className={`cb-status-tab ${activeTab === VERIFICATION_STATUS.PENDING ? 'active' : ''}`} onClick={() => setActiveTab(VERIFICATION_STATUS.PENDING)}>
                        Pending ({counts.pending})
                    </div>
                    <div className={`cb-status-tab ${activeTab === VERIFICATION_STATUS.PROCESSING ? 'active' : ''}`} onClick={() => setActiveTab(VERIFICATION_STATUS.PROCESSING)}>
                        Processing ({counts.processing})
                    </div>
                    <div className={`cb-status-tab ${activeTab === VERIFICATION_STATUS.COMPLETED ? 'active' : ''}`} onClick={() => setActiveTab(VERIFICATION_STATUS.COMPLETED)}>
                        Verified ({counts.verified})
                    </div>
                    <div className={`cb-status-tab ${activeTab === VERIFICATION_STATUS.REJECTED ? 'active' : ''}`} onClick={() => setActiveTab(VERIFICATION_STATUS.REJECTED)}>
                        Rejected ({counts.rejected})
                    </div>
                </div>

                <div className="d-flex gap-2 pb-2 cb-task-actions">
                    <div className="dropdown">
                        <button
                            className="btn btn-soft-primary btn-sm dropdown-toggle shadow-none"
                            type="button"
                            data-bs-toggle="dropdown"
                            aria-expanded="false"
                        >
                            {selectedTier?.name || 'Select Tier'}
                        </button>
                        <ul className="dropdown-menu dropdown-menu-end shadow-lg border-0 mt-0">
                            {tiersData.map((tier: BorrowerTier) => (
                                <li key={tier.id}>
                                    <a
                                        className="dropdown-item"
                                        href="#"
                                        onClick={(e) => { e.preventDefault(); handleSelectTier(tier); }}
                                    >
                                        {tier.name}
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
                                    className={`dropdown-item d-flex align-items-center ${selectedTasks.length === 0 ? 'disabled opacity-50' : ''}`}
                                    href="#"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        if (selectedTasks.length > 0) {
                                            setModalConfig({ show: true, type: 'manual_verify', taskId: null, isBulk: true });
                                        }
                                    }}
                                >
                                    <i className="ri-check-double-line me-2 text-success"></i> Bulk Verification
                                </a>
                            </li>
                            <li>
                                <a
                                    className={`dropdown-item d-flex align-items-center ${selectedTasks.length === 0 ? 'disabled opacity-50' : ''}`}
                                    href="#"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        if (selectedTasks.length > 0) {
                                            setModalConfig({ show: true, type: 'reject', taskId: null, isBulk: true });
                                        }
                                    }}
                                >
                                    <i className="ri-close-circle-line me-2 text-danger"></i> Bulk Rejection
                                </a>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>

            {filteredTasks.length > 0 ? (
                <div className="list-group list-group-flush border-dashed mt-3">
                    {filteredTasks.map((task) => (
                        <div key={task.id} className={`list-group-item d-flex align-items-center cb-task-list-item px-0`}>
                            <div className="flex-shrink-0 me-3">
                                <div className="form-check fs-18">
                                    <input
                                        className="form-check-input border-2 cb-task-checkbox"
                                        type="checkbox"
                                        checked={selectedTasks.includes(task.id)}
                                        onChange={() => toggleSelectTask(task.id)}
                                        disabled={task.isVerified}
                                        id={`task-${task.id}`}
                                    />
                                </div>
                            </div>
                            <div className="flex-grow-1">
                                <div className="d-flex align-items-center">
                                    {task.logo && (
                                        <div className="cb-task-logo-container">
                                            <img src={task.logo} alt={task.title} className="cb-task-logo" />
                                        </div>
                                    )}
                                    <label
                                        htmlFor={`task-${task.id}`}
                                        className={`cb-task-title mb-0 ${task.isVerified ? 'text-success' : 'text-dark'}`}
                                    >
                                        {task.title}
                                    </label>
                                    <span className={`ms-2 cb-status-badge ${task.status === VERIFICATION_STATUS.COMPLETED ? 'cb-status-verified' :
                                        task.status === VERIFICATION_STATUS.PROCESSING ? 'cb-status-processing' :
                                            task.status === VERIFICATION_STATUS.REJECTED ? 'cb-status-rejected' : 'cb-status-pending'
                                        }`}>
                                        {task.status}
                                    </span>
                                </div>
                            </div>
                            <div className="flex-shrink-0 d-flex gap-2">
                                {task.status === VERIFICATION_STATUS.COMPLETED ? (
                                    <>
                                        <span className="badge badge-soft-success d-flex align-items-center fw-normal px-1">
                                            <i className="ri-check-line me-1"></i> Verified
                                        </span>
                                    </>
                                ) : task.status === VERIFICATION_STATUS.REJECTED ? (
                                    <>
                                        <button
                                            type="button"
                                            className="btn btn-sm btn-soft-success shadow-none cb-verify-btn"
                                            onClick={() => setModalConfig({ show: true, type: 'manual_verify', taskId: task.id, isBulk: false })}
                                        >
                                            Verify
                                        </button>
                                        <span className="badge badge-soft-danger fw-normal d-flex align-items-center px-1">
                                            <i className="ri-close-line me-1"></i> Rejected
                                        </span>
                                    </>
                                ) : (
                                    <>
                                        <button
                                            type="button"
                                            className="btn btn-sm btn-soft-success shadow-none cb-verify-btn"
                                            onClick={() => setModalConfig({ show: true, type: 'manual_verify', taskId: task.id, isBulk: false })}
                                        >
                                            Verify
                                        </button>
                                        <button
                                            type="button"
                                            className="btn btn-sm btn-soft-danger shadow-none cb-verify-btn"
                                            onClick={() => setModalConfig({ show: true, type: 'reject', taskId: task.id, isBulk: false })}
                                        >
                                            Reject
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center text-muted mb-0 mt-4 py-4 bg-light rounded-2 border border-dashed" style={{ fontSize: '14px' }}>
                    No {activeTab !== 'all' ? activeTab : ''} tasks found for this tier.
                </div>
            )}

            <VerificationActionModal
                show={modalConfig.show}
                onHide={() => setModalConfig(prev => ({ ...prev, show: false }))}
                onConfirm={(reason) => {
                    const isVerify = modalConfig.type === 'manual_verify';
                    const status = isVerify ? VERIFICATION_STATUS.COMPLETED : VERIFICATION_STATUS.REJECTED;
                    const taskIds = modalConfig.isBulk ? selectedTasks : (modalConfig.taskId ? [modalConfig.taskId] : []);
                    const migratedTaskId = !modalConfig.isBulk && modalConfig.taskId
                        ? tasks.find(t => t.id === modalConfig.taskId)?.migrated_task_id
                        : null;

                    if (taskIds.length > 0 && clientId) {
                        verifyMutation.mutate({
                            task_ids: taskIds,
                            borrower_id: clientId,
                            status: status,
                            note: reason,
                            migrated_task_id: migratedTaskId
                        }, {
                            onSuccess: () => {
                                // Apply local updates if needed, though queries will invalidate
                                if (modalConfig.isBulk) {
                                    bulkAction(isVerify);
                                    setSelectedTasks([]);
                                } else if (modalConfig.taskId) {
                                    handleAction(modalConfig.taskId, isVerify);
                                }
                                setModalConfig(prev => ({ ...prev, show: false }));
                            }
                        });
                    }
                }}
                actionType={modalConfig.type}
                loading={verifyMutation.isPending}
                isBulk={modalConfig.isBulk}
                count={modalConfig.isBulk ? selectedTasks.length : 1}
            />
        </div>
    );
}
