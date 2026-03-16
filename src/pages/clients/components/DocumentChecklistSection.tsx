import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import type { ChecklistItem } from '../../../modules/client/types';
import { useClientChecklist, useSaveClientChecklist } from '../../../modules/client/queries';

export interface DocumentChecklistSectionRef {
    save: () => Promise<void>;
}

interface DocumentChecklistSectionProps {
    clientId: string | number;
    isLoading?: boolean;
}

const DocumentChecklistSection = forwardRef<DocumentChecklistSectionRef, DocumentChecklistSectionProps>(({ clientId, isLoading: parentLoading = false }, ref) => {
    
    // Internal state for the checklist
    const [localChecklist, setLocalChecklist] = useState<ChecklistItem[]>([]);

    // Hooks
    const { data: fetchedChecklist, isLoading, isError } = useClientChecklist(clientId, !!clientId);
    const saveMutation = useSaveClientChecklist();

    // Sync fetched data to local state
    useEffect(() => {
        if (fetchedChecklist && fetchedChecklist.data) {
            // Sort by sort_order
            const sortedList = [...fetchedChecklist.data].sort((a: ChecklistItem, b: ChecklistItem) => a.sort_order - b.sort_order);
            setLocalChecklist(sortedList);
        }
    }, [fetchedChecklist]);

    useImperativeHandle(ref, () => ({
        save: async () => {
            const checkedIds = localChecklist.filter(item => item.current_status).map(item => item.id);
            await saveMutation.mutateAsync({ id: clientId, checkedIds });
        }
    }));

    const handleChecklistChange = (itemId: number) => {
        setLocalChecklist(prev => prev.map(item =>
            item.id === itemId ? { ...item, current_status: !item.current_status } : item
        ));
    };

    if (isLoading) {
        return (
            <div className="card shadow-none border">
                <div className="card-body">
                    <div className="row mb-3">
                        <div className="col-12">
                            <div className="placeholder-glow">
                                <span className="placeholder col-6"></span>
                            </div>
                        </div>
                    </div>
                    <div className="row">
                        <div className="col-lg-6">
                            <div className="vstack gap-2">
                                {[1, 2, 3, 4, 5].map(i => (
                                    <div className="placeholder-glow d-flex align-items-center gap-2" key={i}>
                                        <span className="placeholder col-1" style={{ width: '20px', height: '20px' }}></span>
                                        <span className="placeholder col-8"></span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="col-lg-6">
                            <div className="vstack gap-2">
                                {[1, 2, 3, 4, 5].map(i => (
                                    <div className="placeholder-glow d-flex align-items-center gap-2" key={i}>
                                        <span className="placeholder col-1" style={{ width: '20px', height: '20px' }}></span>
                                        <span className="placeholder col-8"></span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Split checklist into two columns
    const list = localChecklist || [];
    const midPoint = Math.ceil(list.length / 2);
    const firstColumn = list.slice(0, midPoint);
    const secondColumn = list.slice(midPoint);

    return (
        <div className="card shadow-none border">
            <div className="card-body">
                <div className="row mb-3">
                    <div className="col-12">
                        <h5 className="card-title mb-0">Required Documents Checklist</h5>
                    </div>
                </div>

                <div className="row">
                    <div className="col-lg-6">
                        <div className="vstack gap-2">
                            {firstColumn.map(item => (
                                <div className="form-check" key={item.id}>
                                    <input
                                        className="form-check-input"
                                        type="checkbox"
                                        id={`doc_${item.id}`}
                                        checked={item.current_status}
                                        onChange={() => handleChecklistChange(item.id)}
                                    />
                                    <label className="form-check-label cursor-pointer" htmlFor={`doc_${item.id}`}>
                                        {item.name}
                                    </label>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="col-lg-6">
                        <div className="vstack gap-2">
                            {secondColumn.map(item => (
                                <div className="form-check" key={item.id}>
                                    <input
                                        className="form-check-input"
                                        type="checkbox"
                                        id={`doc_${item.id}`}
                                        checked={item.current_status}
                                        onChange={() => handleChecklistChange(item.id)}
                                    />
                                    <label className="form-check-label cursor-pointer" htmlFor={`doc_${item.id}`}>
                                        {item.name}
                                    </label>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {list.length === 0 && (
                    <div className="text-center text-muted py-4">
                        {isError ? "Failed to load checklist." : "No checklist items found."}
                    </div>
                )}
            </div>
        </div>
    );
});

export default DocumentChecklistSection;
