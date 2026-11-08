import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { toast } from 'react-toastify';
import { saveDepartment, deleteDepartment } from '../../../modules/employee';
import DeleteConfirmationModal from '../../../components/Common/Modals/DeleteConfirmationModal';
import DeleteBlockedModal from '../../../components/Common/Modals/DeleteBlockedModal';

// The API's reason (duplicate name, department in use), else a fallback.
const apiMessage = (error, fallback) =>
    error?.response?.data?.errors?.name || error?.response?.data?.message || fallback;

// Same wording as the API's refusal (employee.department_in_use).
const inUseMessage = (dept) => {
    const count = Number(dept.employees_count);
    return count === 1
        ? `Department "${dept.name}" is assigned to 1 employee and cannot be deleted. Move the employee to another department first.`
        : `Department "${dept.name}" is assigned to ${count} employees and cannot be deleted. Move them to another department first.`;
};

export default function DepartmentModal({ visible, onHide, onSuccess, departments = [] }) {
    const [departmentName, setDepartmentName] = useState('');
    const [nameError, setNameError] = useState('');
    const [loading, setLoading] = useState(false);
    const [deletingId, setDeletingId] = useState(null);
    // Delete asks first (BUG-183): one click used to remove the department at once.
    const [toDelete, setToDelete] = useState(null);
    // A department employees are in is kept: this says why, instead of the confirmation
    // (as clients and blog tags do).
    const [blocked, setBlocked] = useState(null); // { name, message }
    const navigate = useNavigate();

    const askToDelete = (dept) => {
        if (Number(dept.employees_count) > 0) setBlocked({ name: dept.name, message: inUseMessage(dept) });
        else setToDelete({ id: dept.id, name: dept.name });
    };

    // As "Go to Client": the way out is to move those employees, so open them.
    const viewEmployees = () => {
        const name = blocked?.name;
        setBlocked(null);
        handleClose();
        navigate(`/employees?${new URLSearchParams({ department: name })}`);
    };

    const handleSave = async () => {
        if (!departmentName.trim()) {
            setNameError('Department name is required');
            return;
        }

        setLoading(true);
        setNameError('');
        try {
            await saveDepartment({ name: departmentName });
            toast.success('Department added successfully');
            setDepartmentName('');
            onSuccess();
            onHide();
        } catch (error) {
            // A name that already exists (BUG-182) is shown under the field.
            if (error?.response?.status === 422) {
                setNameError(apiMessage(error, 'Failed to save department'));
            } else {
                toast.error(apiMessage(error, 'Failed to save department'));
            }
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setDepartmentName('');
        setNameError('');
        onHide();
    };

    const confirmDelete = async () => {
        if (!toDelete) return;
        setDeletingId(toDelete.id);
        try {
            await deleteDepartment(toDelete.id);
            toast.success('Department deleted successfully');
            onSuccess();
        } catch (error) {
            // The API refuses a department employees are in (assigned since the list
            // loaded), and says why - shown in the "cannot be deleted" modal.
            if (error?.response?.status === 422) {
                setBlocked({ name: toDelete.name, message: apiMessage(error, 'This department cannot be deleted.') });
            } else {
                toast.error(apiMessage(error, 'Failed to delete department'));
            }
        } finally {
            setDeletingId(null);
            setToDelete(null);
        }
    };

    return (
        <>
            <Dialog
                header="Add New Department"
                visible={visible}
                style={{ width: '30vw' }}
                onHide={handleClose}
                baseZIndex={1000}
            >
                <div className="p-fluid">
                    <div className="field">
                        <label htmlFor="deptName">Department Name</label>
                        <InputText
                            id="deptName"
                            value={departmentName}
                            onChange={(e) => { setDepartmentName(e.target.value); setNameError(''); }}
                            // Bootstrap's is-invalid draws the red box; p-invalid alone has no style on a plain input here.
                            className={`form-control ${nameError ? 'is-invalid p-invalid' : ''}`}
                            aria-invalid={nameError ? 'true' : 'false'}
                            aria-describedby={nameError ? 'deptNameError' : undefined}
                            autoFocus
                        />
                        {nameError && <div id="deptNameError" className="invalid-feedback d-block">{nameError}</div>}
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
                                                onClick={() => askToDelete(dept)}
                                                disabled={deletingId === dept.id}
                                                aria-label={`Delete ${dept.name}`}
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

            <DeleteConfirmationModal
                show={toDelete !== null}
                onClose={() => setToDelete(null)}
                onConfirm={confirmDelete}
                loading={deletingId !== null}
                title="Delete Department?"
                text={toDelete ? `This will permanently remove the department "${toDelete.name}".` : undefined}
            />

            <DeleteBlockedModal
                show={blocked !== null}
                title="Department Cannot Be Deleted"
                message={blocked?.message ?? ''}
                primaryAction={{ label: 'View Employees', icon: 'ri-team-line', onClick: viewEmployees }}
                onClose={() => setBlocked(null)}
            />
        </>
    );
}
