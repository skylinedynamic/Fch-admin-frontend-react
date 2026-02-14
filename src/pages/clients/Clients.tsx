import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDeleteClients, usePartners, useAllUsers, useBorrowerTiers } from '../../modules/client/queries';
import { getUser } from '../../lib/auth';
import { usePermissions } from '../../lib/auth/usePermissions';
import DeleteConfirmationModal from '../../components/Common/Modals/DeleteConfirmationModal';
import ClientStats from './components/ClientStats';
import ClientListTable from './components/ClientListTable';
import { Client } from '../../modules/client/types';
import { AuthUser } from '../../store/auth';

export default function Clients() {
    const navigate = useNavigate();
    const { hasPermission } = usePermissions();

    // Shared state between header and components
    const [selectedClients, setSelectedClients] = useState<Client[]>([]);
    const [totalRecords, setTotalRecords] = useState<number>(0);
    const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
    const [deleteRows, setDeleteRows] = useState<Client[]>([]);

    // User context
    const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
    const [isHost, setIsHost] = useState<boolean>(false);

    useEffect(() => {
        const user = getUser();
        setCurrentUser(user);
        setIsHost(user?.is_host === 1);
    }, []);

    // Global data needed for filters
    const { data: partnersList = [] } = usePartners(isHost);
    const { data: assignedUsersList = [] } = useAllUsers();
    const { data: tiersList = [] } = useBorrowerTiers();

    // React Query Mutations
    const deleteClientsMutation = useDeleteClients();

    // Delete handlers
    const openDeleteModal = () => {
        if (!selectedClients || selectedClients.length === 0) {
            toast.warn('Please select at least one client to delete.');
            return;
        }
        setDeleteRows(selectedClients);
        setShowDeleteModal(true);
    };

    const handleDeleteConfirm = async () => {
        if (!deleteRows || deleteRows.length === 0) return;
        const ids = deleteRows.map(c => c.id).filter((id): id is string | number => id !== undefined);

        try {
            await deleteClientsMutation.mutateAsync(ids);
            toast.success("Client(s) deleted successfully.");
            setShowDeleteModal(false);
            setSelectedClients([]);
        } catch (err: any) {
            const errorMsg = err.response?.data?.message || err.message || 'Failed to delete clients.';
            toast.error(errorMsg);
        }
    };

    return (
        <div className="page-content">
            <div className="container-fluid">
                {/* Page Header */}
                <div className="row pb-1 page-subheader-sticky bg-body">
                    <div className="col-12">
                        <div className="d-flex align-items-center justify-content-between flex-row py-2">
                            <div className="flex-grow-1">
                                <h4 className="fs-20 mb-1">Clients</h4>
                                <nav aria-label="breadcrumb" className="d-none d-sm-block">
                                    <ol className="breadcrumb m-0">
                                        <li className="breadcrumb-item"><Link to="/">Dashboard</Link></li>
                                        <li className="breadcrumb-item active" aria-current="page">Clients</li>
                                    </ol>
                                </nav>
                            </div>
                            <div className="mt-0">
                                <div className="btn-group">
                                    {hasPermission('delete clients') && selectedClients.length > 0 ? (
                                        <>
                                            <button type="button" className="btn bg-success text-white fw-medium">Actions</button>
                                            <button type="button" className="btn bg-success text-white fw-medium dropdown-toggle dropdown-toggle-split" data-bs-toggle="dropdown" aria-expanded="false">
                                                <span className="visually-hidden">Toggle dropdown</span>
                                            </button>
                                            <ul className="dropdown-menu dropdown-menu-end">
                                                <li>
                                                    <button type="button" className="dropdown-item text-danger" onClick={openDeleteModal}>
                                                        <i className="ri-delete-bin-6-line me-1 align-bottom"></i> Delete Selected
                                                    </button>
                                                </li>
                                            </ul>
                                        </>
                                    ) : hasPermission('create clients') ? (
                                        <button
                                            type="button"
                                            className="btn btn-primary fw-medium waves-effect waves-light"
                                            onClick={() => navigate('/clients/create')}
                                        >
                                            <i className="ri-add-fill me-1 align-bottom"></i> Add Client
                                        </button>
                                    ) : null}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Statistics Cards */}
                <ClientStats
                    isHost={isHost}
                    partnerId={currentUser?.partner_id}
                    filteredTotal={totalRecords}
                />

                {/* Filters and Table */}
                <div className="row">
                    <div className="col-lg-12">
                        <div className="card">
                            <div className="card-body">
                                <ClientListTable
                                    isHost={isHost}
                                    partnersList={partnersList}
                                    assignedUsersList={assignedUsersList}
                                    tiersList={tiersList}
                                    deletePermission={hasPermission('delete clients')}
                                    selectedClients={selectedClients}
                                    onSelectionChange={setSelectedClients}
                                    onTotalRecordsChange={setTotalRecords}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <DeleteConfirmationModal
                    show={showDeleteModal}
                    onConfirm={handleDeleteConfirm}
                    onClose={() => setShowDeleteModal(false)}
                    loading={deleteClientsMutation.isPending}
                    text="The selected clients and all associated data will be deleted."
                />
            </div>
        </div>
    );
}
