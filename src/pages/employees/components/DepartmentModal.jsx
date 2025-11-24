import React, { useState } from 'react';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { toast } from 'react-toastify';
import { saveDepartment } from '../../../modules/employee';

export default function DepartmentModal({ visible, onHide, onSuccess }) {
    const [departmentName, setDepartmentName] = useState('');
    const [loading, setLoading] = useState(false);

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
            </div>
        </Dialog>
    );
}
