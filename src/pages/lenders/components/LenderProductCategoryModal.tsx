import React, { useState } from 'react';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { toast } from 'react-toastify';
import { createLenderProductCategory, updateLenderProductCategory, deleteLenderProductCategory } from '../../../modules/lender/services';
import DeleteConfirmationModal from '../../../components/Common/Modals/DeleteConfirmationModal';
import DeleteBlockedModal from '../../../components/Common/Modals/DeleteBlockedModal';
import { InUseEntry, inUseFromError, inUseFromList, inUseMessage } from '../../../utils/inUseDelete';

export default function LenderProductCategoryModal({ visible, onHide, onSuccess, categories = [] }: any) {
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
    const [blocked, setBlocked] = useState<InUseEntry | null>(null);

    const handleSave = async () => {
        setNameError('');
        setLoading(true);
        try {
            await createLenderProductCategory({ name: name.trim() });
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

    // In use by a funding sequence (the list says so): say it cannot be deleted
    // at once - no "Are you sure?" for a delete that would be refused.
    const handleDeleteClick = (item: any) => {
        const inUse = inUseFromList(item);
        if (inUse) {
            setBlocked(inUse);
            return;
        }
        setItemToDelete(item.id);
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        if (!itemToDelete) return;
        setDeletingId(itemToDelete);
        try {
            await deleteLenderProductCategory(itemToDelete);
            toast.success('Funding type deleted successfully');
            setShowDeleteModal(false);
            onSuccess();
        } catch (error: any) {
            // Used by a funding sequence: kept, and said why - like a blog tag in use.
            const refused = inUseFromError(error);
            if (refused) {
                setShowDeleteModal(false);
                setBlocked(refused);
            } else {
                toast.error(error?.response?.data?.message || 'Failed to delete funding type');
            }
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
            await updateLenderProductCategory(id, { name: editName.trim() });
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
                        <label htmlFor="categoryName" className="form-label fw-semibold">New Funding Type Name</label>
                        <div>
                            <div className="p-inputgroup flex-1">
                                <InputText
                                    id="categoryName"
                                    value={name}
                                    onChange={(e) => { setName(e.target.value); if (nameError) setNameError(''); }}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                                    placeholder="e.g. Business Credit Cards"
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
                    {categories.length > 0 && (
                        <>
                            <hr className="my-3" />
                            <label className="form-label fw-semibold mb-2">Existing Funding Types</label>
                            <div style={{ maxHeight: '220px', overflowY: 'auto' }}>
                                {/* Newest first, so one just added is at the top, not out of
                                    sight at the bottom. A copy: the given list (sort order,
                                    also used by the dropdowns) is left as it is. */}
                                {[...categories].sort((a: any, b: any) => Number(b.id) - Number(a.id)).map((item: any) => (
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
                                                    onClick={() => handleDeleteClick(item)}
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
                text="Are you sure you want to delete this funding type?"
            />

            <DeleteBlockedModal
                show={blocked !== null}
                title="Funding Type Cannot Be Deleted"
                message={blocked ? inUseMessage(blocked, 'Remove it from their Underwriting Logic first.') : ''}
                onClose={() => setBlocked(null)}
            />
        </>
    );
}
