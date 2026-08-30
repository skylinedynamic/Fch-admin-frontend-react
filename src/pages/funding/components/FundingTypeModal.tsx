import React, { useState } from 'react';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { toast } from 'react-toastify';
import { createFundingType, updateFundingType, deleteFundingType } from '../../../modules/funding/services';
import DeleteConfirmationModal from '../../../components/Common/Modals/DeleteConfirmationModal';

export default function FundingTypeModal({ visible, onHide, onSuccess, types = [] }: any) {
    const [name, setName] = useState<string>('');
    const [nameError, setNameError] = useState<string>('');
    const [editNameError, setEditNameError] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false);
    const [deletingId, setDeletingId] = useState<any>(null);
    const [editingItem, setEditingItem] = useState<any>(null);
    const [editName, setEditName] = useState<string>('');
    const [editingLoading, setEditingLoading] = useState<boolean>(false);
    const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
    const [itemToDelete, setItemToDelete] = useState<any>(null);

    const handleSave = async () => {
        setNameError('');
        setLoading(true);
        try {
            await createFundingType({ name: name.trim() });
            toast.success('Funding type added successfully');
            setName('');
            onSuccess();
        } catch (error: any) {
            if (error?.response?.status === 422) {
                setNameError(error.response.data?.errors?.name || error.response.data?.message || 'Failed to save funding type');
            } else {
                toast.error(error?.response?.data?.message || 'Failed to save funding type');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteClick = (id: any) => {
        setItemToDelete(id);
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        if (!itemToDelete) return;
        setDeletingId(itemToDelete);
        try {
            await deleteFundingType(itemToDelete);
            toast.success('Funding type deleted successfully');
            setShowDeleteModal(false);
            onSuccess();
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Failed to delete funding type');
        } finally {
            setDeletingId(null);
            setItemToDelete(null);
        }
    };

    const startEdit = (item: any) => {
        setEditingItem(item.id);
        setEditName(item.name);
    };

    const cancelEdit = () => {
        setEditingItem(null);
        setEditName('');
    };

    const handleUpdate = async (id: any) => {
        setEditNameError('');
        setEditingLoading(true);
        try {
            await updateFundingType(id, { name: editName.trim() });
            toast.success('Funding type updated successfully');
            setEditingItem(null);
            setEditName('');
            onSuccess();
        } catch (error: any) {
            if (error?.response?.status === 422) {
                setEditNameError(error.response.data?.errors?.name || error.response.data?.message || 'Failed to update funding type');
            } else {
                toast.error(error?.response?.data?.message || 'Failed to update funding type');
            }
        } finally {
            setEditingLoading(false);
        }
    };

    const handleClose = () => {
        setName('');
        setNameError('');
        setEditNameError('');
        setEditingItem(null);
        setEditName('');
        onHide();
    };

    return (
        <>
            <Dialog
                header="Manage Funding Types"
            visible={visible}
            style={{ width: '32vw' }}
            baseZIndex={1000}
            onHide={handleClose}
            breakpoints={{ '960px': '75vw', '641px': '100vw' }}
        >
            <div className="p-fluid">
                {/* Add New */}
                <div className="field mb-3">
                    <label htmlFor="typeName" className="form-label fw-semibold">New Type Name</label>
                    <div>
                        <div className="p-inputgroup flex-1">
                            <InputText
                                id="typeName"
                                value={name}
                                onChange={(e) => { setName(e.target.value); if (nameError) setNameError(''); }}
                                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                                placeholder="e.g. SBA Loan"
                                className={nameError ? 'p-invalid is-invalid' : ''}
                                style={nameError ? { borderTopRightRadius: 0, borderBottomRightRadius: 0, backgroundImage: 'none' } : {}}
                                autoFocus
                            />
                            <button
                                type="button"
                                className="btn btn-primary px-3"
                                onClick={handleSave}
                                disabled={loading}
                            >
                                {loading ? (
                                    <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                                ) : (
                                    <><i className="ri-add-line me-1 align-bottom"></i> Add</>
                                )}
                            </button>
                        </div>
                        {nameError && <div className="invalid-feedback d-block">{nameError}</div>}
                    </div>
                </div>

                {/* Existing List */}
                {types.length > 0 && (
                    <>
                        <hr className="my-3" />
                        <label className="form-label fw-semibold mb-2">Existing Types</label>
                        <div style={{ maxHeight: '220px', overflowY: 'auto' }}>
                            {types.map((item) => (
                                <div
                                    key={item.id}
                                    className="d-flex align-items-center gap-2 mb-2 p-2 rounded border bg-light"
                                >
                                    {editingItem === item.id ? (
                                        <>
                                            <div className="flex-grow-1">
                                                <InputText
                                                    value={editName}
                                                    onChange={(e) => { setEditName(e.target.value); if (editNameError) setEditNameError(''); }}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') handleUpdate(item.id);
                                                        if (e.key === 'Escape') cancelEdit();
                                                    }}
                                                    className={`w-100 ${editNameError ? 'p-invalid is-invalid' : ''}`}
                                                    autoFocus
                                                />
                                                {editNameError && <div className="invalid-feedback d-block">{editNameError}</div>}
                                            </div>
                                            <button
                                                type="button"
                                                className="btn btn-sm btn-success"
                                                onClick={() => handleUpdate(item.id)}
                                                disabled={editingLoading}
                                            >
                                                {editingLoading
                                                    ? <span className="spinner-border spinner-border-sm" role="status"></span>
                                                    : <i className="ri-check-line"></i>}
                                            </button>
                                            <button
                                                type="button"
                                                className="btn btn-sm btn-secondary"
                                                onClick={cancelEdit}
                                                disabled={editingLoading}
                                            >
                                                <i className="ri-close-line"></i>
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <span className="flex-grow-1 text-truncate">{item.name}</span>
                                            <button
                                                type="button"
                                                className="btn btn-sm btn-soft-primary"
                                                onClick={() => startEdit(item)}
                                                title="Edit"
                                            >
                                                <i className="ri-pencil-line"></i>
                                            </button>
                                            <button
                                                type="button"
                                                className="btn btn-sm btn-soft-danger"
                                                onClick={() => handleDeleteClick(item.id)}
                                                disabled={deletingId === item.id}
                                                title="Delete"
                                            >
                                                {deletingId === item.id
                                                    ? <span className="spinner-border spinner-border-sm" role="status"></span>
                                                    : <i className="ri-delete-bin-line"></i>}
                                            </button>
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                    </>
                )}

                <div className="d-flex justify-content-end mt-3">
                    <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={handleClose}
                    >
                        <i className="ri-close-line me-1 align-bottom"></i> Close
                    </button>
                </div>
            </div>
        </Dialog>
        
        <DeleteConfirmationModal
            show={showDeleteModal}
            onClose={() => setShowDeleteModal(false)}
            onConfirm={confirmDelete}
            loading={deletingId !== null}
            text="Are you sure you want to delete this type?"
        />
        </>
    );
}
