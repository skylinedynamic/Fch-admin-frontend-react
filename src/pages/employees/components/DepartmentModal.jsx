import React, { useState } from 'react';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { toast } from 'react-toastify';
import { saveDepartment, deleteDepartment } from '../../../modules/employee';

export default function DepartmentModal({ visible, onHide, onSuccess, departments = [] }) {
    const [departmentName, setDepartmentName] = useState('');
    const [loading, setLoading] = useState(false);
    const [deletingId, setDeletingId] = useState(null);

    const handleSave = async () => {
        if (!departmentName.trim()) {
            toast.error('Department name is required');
            return;
        }

        setLoading(true);
        try {
            await saveDepartment({ name: departmentName });
            toast.success('Department added successfully');
            setDepartmentName('');
            onSuccess();
            onHide();
        } catch (error) {
            console.error('Failed to save department', error);
            toast.error('Failed to save department');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setDepartmentName('');
        onHide();
    };

    const handleDelete = async (id, name) => {
        setDeletingId(id);
        try {
            await deleteDepartment(id);
            toast.success('Department deleted successfully');
            onSuccess();
        } catch (error) {
            toast.error('Failed to delete department');
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <Dialog
            header="Add New Department"
            visible={visible}
            style={{ width: '30vw' }}
            onHide={handleClose}
        >
            <div className="p-fluid">
                <div className="field">
                    <label htmlFor="deptName">Department Name</label>
                    <InputText
                        id="deptName"
                        value={departmentName}
                        onChange={(e) => setDepartmentName(e.target.value)}
                        autoFocus
                    />
                </div>
                <div className="d-flex justify-content-end mt-3 gap-2">
                    <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={handleClose}
                        disabled={loading}
                    >
                        <i className="ri-close-line me-1 align-bottom"></i> Cancel
                    </button>
                    <button
                        type="button"
                        className="btn btn-primary"
                        onClick={handleSave}
                        disabled={loading}
                    >
                        {loading ? (
                            <>
                                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                Saving...
                            </>
                        ) : (
                            <>
                                <i className="ri-save-3-fill me-1 align-bottom"></i> Submit
                            </>
                        )}
                    </button>
                </div>

                {/* Department List */}
                {departments.length > 0 && (
                    <>
                        <hr className="my-4" />
                        <div className="field">
                            <label className="mb-3">Existing Departments</label>
                            <div className="d-flex flex-wrap gap-2" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                                {departments.map((dept) => (
                                    <span
                                        key={dept.id}
                                        className="badge bg-light text-dark border d-inline-flex align-items-center"
                                        style={{ fontSize: '0.875rem', padding: '0.5rem 0.75rem' }}
                                    >
                                        {dept.name}
                                        <button
                                            type="button"
                                            className="btn-close btn-close-sm ms-2"
                                            onClick={() => handleDelete(dept.id, dept.name)}
                                            disabled={deletingId === dept.id}
                                            aria-label="Delete"
                                            style={{ fontSize: '0.65rem', opacity: deletingId === dept.id ? 0.3 : 0.5 }}
                                        >
                                            {deletingId === dept.id && (
                                                <span className="spinner-border spinner-border-sm position-absolute" role="status" aria-hidden="true"></span>
                                            )}
                                        </button>
                                    </span>
                                ))}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </Dialog>
    );
}
