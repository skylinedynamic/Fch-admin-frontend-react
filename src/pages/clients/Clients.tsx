import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDeleteClients, useArchiveClients, useUnarchiveClients, useAllUsers, useBorrowerTiers } from '../../modules/client/queries';
import { usePartnerOptions, partnerOptionLabel } from '../../modules/partner';
import { getUser } from '../../lib/auth';
import { usePermissions } from '../../lib/auth/usePermissions';
import DeleteConfirmationModal from '../../components/Common/Modals/DeleteConfirmationModal';
import ClientDeleteBlockedModal, { BlockedClient } from './components/ClientDeleteBlockedModal';
import { checkClientsDeletable } from '../../modules/client/services';
import ClientStats from './components/ClientStats';
import ClientListTable from './components/ClientListTable';
import { Client, ClientListStatistics } from '../../modules/client/types';
import { AuthUser } from '../../store/auth';
import { toast } from 'react-toastify';
import PageHeader from '../common/PageHeader';

export default function Clients() {
    const navigate = useNavigate();
    const { hasPermission } = usePermissions();

    // Shared state between header and components
    const [selectedClients, setSelectedClients] = useState<Client[]>([]);
    const [totalRecords, setTotalRecords] = useState<number>(0);
    const [stats, setStats] = useState<ClientListStatistics | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
    const [deleteRows, setDeleteRows] = useState<Client[]>([]);
    const [checkingDeletable, setCheckingDeletable] = useState<boolean>(false);
    const [blockedClients, setBlockedClients] = useState<BlockedClient[]>([]);
    const [blockedSelectionSize, setBlockedSelectionSize] = useState<number>(0);

    // User context
    const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
    const [isHost, setIsHost] = useState<boolean>(false);

    useEffect(() => {
        const user = getUser();
        setCurrentUser(user);
        setIsHost(user?.is_host == 1);

        // Add class to body to prevent global scroll
        document.body.classList.add('table-page-fit-active');

        return () => {
            document.body.classList.remove('table-page-fit-active');
        };
    }, []);

    // Global data needed for filters
    const { data: partnerOptions = [] } = usePartnerOptions(isHost);
    const partnersList = partnerOptions.map((partner) => ({ id: partner.id, displayLabel: partnerOptionLabel(partner) }));
    const { data: assignedUsersList = [] } = useAllUsers();
    const { data: tiersList = [] } = useBorrowerTiers();

    // React Query Mutations
    const deleteClientsMutation = useDeleteClients();
    const archiveClientsMutation = useArchiveClients();
    const unarchiveClientsMutation = useUnarchiveClients();

    // A client with a paid invoice cannot be deleted. Check first, so the user
    // is told why (and offered Edit Client) instead of being asked to confirm.
    const showBlocked = (rows: BlockedClient[], selectedCount: number) => {
        setBlockedClients(rows);
        setBlockedSelectionSize(selectedCount);
    };

    // Delete handlers
    const openDeleteModal = async () => {
        if (!selectedClients || selectedClients.length === 0) {
            toast.warn('Please select at least one client to delete.');
            return;
        }
        const ids = selectedClients.map(c => c.id).filter((id): id is string | number => id !== undefined);

        setCheckingDeletable(true);
        try {
            const blocked = (await checkClientsDeletable(ids))
                .filter(row => !row.is_deletable)
                .map(row => ({ id: row.id, name: row.name }));
            if (blocked.length > 0) {
                showBlocked(blocked, ids.length);
                return;
            }
        } catch {
            // The check is a courtesy - the delete itself still refuses a
            // client with a paid invoice, and that answer opens the same modal.
        } finally {
            setCheckingDeletable(false);
        }

        setDeleteRows(selectedClients);
        setShowDeleteModal(true);
    };

    /**
     * Archive or restore the selected clients.
     *
     * No confirmation step: unlike deleting, this changes nothing about the record
     * or its access - it only takes it out of the working list, and it is
     * reversible from the same menu.
     */
    const handleArchiveToggle = async (archive: boolean) => {
        if (!selectedClients || selectedClients.length === 0) {
            toast.warn(`Please select at least one client to ${archive ? 'archive' : 'restore'}.`);
            return;
        }

        const ids = selectedClients
            .map(c => c.id)
            .filter((id): id is string | number => id !== undefined);

        try {
            const res = archive
                ? await archiveClientsMutation.mutateAsync(ids)
                : await unarchiveClientsMutation.mutateAsync(ids);

            toast.success(res?.message || `Client(s) ${archive ? 'archived' : 'restored'}.`);
            setSelectedClients([]);
        } catch (err: any) {
            toast.error(err.response?.data?.message || err.message || `Failed to ${archive ? 'archive' : 'restore'} clients.`);
        }
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
            const blocked: BlockedClient[] | undefined = err.response?.data?.errors?.blocked;
            if (err.response?.status === 422 && Array.isArray(blocked) && blocked.length > 0) {
                setShowDeleteModal(false);
                showBlocked(blocked, ids.length);
                return;
            }
            const errorMsg = err.response?.data?.message || err.message || 'Failed to delete clients.';
            toast.error(errorMsg);
        }
    };

    return (
        <div className="page-content page-content-fit">
            <div className="container-fluid">
                {/* Page Header */}
                <PageHeader
                    title="Clients"
                    breadcrumbs={[{ label: 'Clients' }]}
                >
                    <div className="btn-group">
                        {(hasPermission('delete clients') || hasPermission('update clients')) && selectedClients.length > 0 ? (
                            <>
                                <button type="button" className="btn bg-success text-white fw-medium">Actions</button>
                                <button type="button" className="btn bg-success text-white fw-medium dropdown-toggle dropdown-toggle-split" data-bs-toggle="dropdown" aria-expanded="false">
                                    <span className="visually-hidden">Toggle dropdown</span>
                                </button>
                                <ul className="dropdown-menu dropdown-menu-end">
                                    {hasPermission('update clients') && (
                                        <>
                                            <li>
                                                <button type="button" className="dropdown-item" onClick={() => handleArchiveToggle(true)}>
                                                    <i className="ri-archive-line me-1 align-bottom"></i> Archive Selected
                                                </button>
                                            </li>
                                            <li>
                                                <button type="button" className="dropdown-item" onClick={() => handleArchiveToggle(false)}>
                                                    <i className="ri-inbox-unarchive-line me-1 align-bottom"></i> Restore Selected
                                                </button>
                                            </li>
                                        </>
                                    )}
                                    {hasPermission('delete clients') && (
                                        <li>
                                            <button type="button" className="dropdown-item text-danger" onClick={openDeleteModal} disabled={checkingDeletable}>
                                                <i className="ri-delete-bin-6-line me-1 align-bottom"></i> Delete Selected
                                            </button>
                                        </li>
                                    )}
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
                </PageHeader>

                {/* Statistics Cards */}
                <ClientStats
                    isHost={isHost}
                    partnerId={currentUser?.partner_id}
                    filteredTotal={totalRecords}
                    stats={stats}
                    isLoading={isLoading}
                />

                {/* Filters and Table */}
                <div className="row row-table-fit">
                    <div className="col-lg-12">
                        <div className="card">
                            <div className="card-body">
                                <ClientListTable
                                    isHost={isHost}
                                    partnersList={partnersList}
                                    assignedUsersList={assignedUsersList}
                                    tiersList={tiersList}
                                    deletePermission={hasPermission('delete clients') || hasPermission('update clients')}
                                    selectedClients={selectedClients}
                                    onSelectionChange={setSelectedClients}
                                    onTotalRecordsChange={setTotalRecords}
                                    onStatsChange={setStats}
                                    onLoadingChange={setIsLoading}
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

                <ClientDeleteBlockedModal
                    show={blockedClients.length > 0}
                    blocked={blockedClients}
                    selectedCount={blockedSelectionSize}
                    canEdit={hasPermission('update clients')}
                    onClose={() => setBlockedClients([])}
                />
            </div>
        </div>
    );
}
