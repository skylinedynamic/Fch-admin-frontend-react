import React, { useState } from 'react';
import { DataTable } from '../../components/Table/DataTableWrapper';
import { Column } from 'primereact/column';
import { Link, useNavigate } from 'react-router-dom';
import { useGroupedResources, useDeleteResource } from '../../modules/resource/queries';
import { ResourceItem } from '../../modules/resource/types';
import DeleteConfirmationModal from '../../components/Common/Modals/DeleteConfirmationModal';
import { toast } from 'react-toastify';
import { usePermissions } from '../../lib/auth/usePermissions';

const TAB_OPTIONS = [
    { value: 'legal_registration', label: 'Legal & Registration' },
    { value: 'business_services', label: 'Business Services' },
    { value: 'download_assets', label: 'Download Assets' },
    { value: 'education_help', label: 'Education & Help' },
    { value: 'training_academy', label: 'Training Academy' },
];

export default function ManageResources() {
    const { hasPermission } = usePermissions();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('legal_registration');
    
    // Modals state
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [resourceToDelete, setResourceToDelete] = useState<ResourceItem | null>(null);

    // Queries
    const { data: groupedData, isLoading } = useGroupedResources();
    const deleteMutation = useDeleteResource();

    const handleEdit = (resource: ResourceItem) => {
        navigate(`/resources/edit/${resource.id}`);
    };

    const handleDeleteClick = (resource: ResourceItem) => {
        setResourceToDelete(resource);
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        if (!resourceToDelete) return;
        try {
            await deleteMutation.mutateAsync(resourceToDelete.id);
            toast.success('Resource deleted successfully');
            setShowDeleteModal(false);
            setResourceToDelete(null);
        } catch (err) {
            toast.error('Failed to delete resource');
        }
    };

    const currentData = groupedData?.data?.[activeTab] || [];

    // Table Templates
    const titleTemplate = (rowData: ResourceItem) => (
        <div className="d-flex align-items-center">
            {rowData.icon && <i className={`${rowData.icon} text-primary fs-18 me-2`}></i>}
            <div>
                <div className="fw-medium text-dark">{rowData.title}</div>
                {rowData.subtitle && <div className="text-muted fs-12">{rowData.subtitle}</div>}
            </div>
        </div>
    );

    const statusTemplate = (rowData: ResourceItem) => (
        <span className={`badge ${rowData.status ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'} text-uppercase`}>
            {rowData.status ? 'Active' : 'Inactive'}
        </span>
    );

    const linkFileTemplate = (rowData: ResourceItem) => {
        if (rowData.file_url) {
            return <a href={rowData.file_url} target="_blank" rel="noreferrer" className="text-primary"><i className="ri-file-download-line me-1"></i> View File</a>;
        }
        if (rowData.link) {
            return <a href={rowData.link} target="_blank" rel="noreferrer" className="text-primary"><i className="ri-external-link-line me-1"></i> Visit Link</a>;
        }
        return <span className="text-muted fs-12 fst-italic">N/A</span>;
    };

    const actionTemplate = (rowData: ResourceItem) => (
        <div className="dropdown">
            <button className="btn btn-sm btn-icon btn-light" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                <i className="ri-more-2-fill"></i>
            </button>
            <ul className="dropdown-menu dropdown-menu-end shadow-sm border-0">
                <li><button className="dropdown-item" onClick={() => handleEdit(rowData)}><i className="ri-pencil-line me-2 align-bottom text-muted"></i> Edit</button></li>
                <li><button className="dropdown-item text-danger" onClick={() => handleDeleteClick(rowData)}><i className="ri-delete-bin-line me-2 align-bottom text-danger"></i> Delete</button></li>
            </ul>
        </div>
    );

    return (
        <div className="page-content">
            <div className="container-fluid">
                <div className="row pb-1 page-subheader-sticky bg-body">
                    <div className="col-12">
                        <div className="d-flex align-items-center justify-content-between flex-row py-2">
                            <div className="flex-grow-1">
                                <h4 className="fs-20 mb-1">Manage Resources</h4>
                                <nav aria-label="breadcrumb" className="d-block">
                                    <ol className="breadcrumb m-0">
                                        <li className="breadcrumb-item"><Link to="/">Dashboard</Link></li>
                                        <li className="breadcrumb-item active" aria-current="page">Resources</li>
                                    </ol>
                                </nav>
                            </div>
                            <div className="mt-0">
                                <button className="btn btn-primary fw-medium" onClick={() => {
                                    navigate('/resources/create', { state: { type: activeTab } });
                                }}>
                                    <i className="ri-add-line me-1 align-bottom"></i> Add Resource
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="row mt-4">
                    <div className="col-12">
                        <div className="card shadow-sm border-0">
                            <div className="card-header bg-transparent border-bottom border-light p-0">
                                <ul className="nav nav-tabs nav-tabs-custom nav-success nav-justified" role="tablist">
                                    {TAB_OPTIONS.map(tab => (
                                        <li className="nav-item" key={tab.value}>
                                            <button
                                                className={`nav-link fw-semibold fs-14 py-3 ${activeTab === tab.value ? 'active' : ''}`}
                                                onClick={() => setActiveTab(tab.value)}
                                            >
                                                {tab.label}
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div className="card-body p-0">
                                <div className="table-responsive table-card border-0">
                                    <DataTable
                                        value={currentData}
                                        loading={isLoading}
                                        emptyMessage="No resources found for this category."
                                        className="p-datatable-sm"
                                        tableStyle={{ minWidth: '50rem' }}
                                    >
                                        <Column header="Title & Subtitle" body={titleTemplate} style={{ minWidth: '300px' }} />
                                        <Column header="File / Link" body={linkFileTemplate} style={{ width: '200px' }} />
                                        <Column header="Status" body={statusTemplate} style={{ width: '150px' }} />
                                        <Column header="Action" body={actionTemplate} style={{ width: '100px', textAlign: 'center' }} />
                                    </DataTable>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Modals */}
                <DeleteConfirmationModal
                    show={showDeleteModal}
                    onConfirm={confirmDelete}
                    onClose={() => setShowDeleteModal(false)}
                    loading={deleteMutation.isPending}
                    text={`Are you sure you want to delete "${resourceToDelete?.title}"?`}
                />
            </div>
        </div>
    );
}
