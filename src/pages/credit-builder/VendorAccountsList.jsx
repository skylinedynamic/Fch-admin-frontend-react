import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { DataTable } from '../../components/Table/DataTableWrapper';
import { Column } from 'primereact/column';
import { toast } from 'react-toastify';
import TableLoader from '../../components/Loader/TableLoader';
import { fetchVendorAccounts, deleteVendorAccount } from '../../modules/vendor-accounts/services';

export default function VendorAccountsList() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [accounts, setAccounts] = useState([]);
    const [totalRecords, setTotalRecords] = useState(0);
    const [lazyParams, setLazyParams] = useState({
        first: 0,
        rows: 10,
        page: 1,
        sortField: 'id',
        sortOrder: 'desc',
        filters: {}
    });

    const loadData = async () => {
        setLoading(true);
        try {
            const payload = {
                page: lazyParams.page,
                per_page: lazyParams.rows,
                sort_field: lazyParams.sortField,
                sort_order: lazyParams.sortOrder,
                filters: lazyParams.filters
            };
            const response = await fetchVendorAccounts(payload);
            setAccounts(response.data || []);
            setTotalRecords(response.meta?.total || response.total || 0);
        } catch (err) {
            console.error(err);
            toast.error('Failed to fetch vendor accounts');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [lazyParams]);

    const onPage = (event) => {
        setLazyParams(prev => ({ ...prev, first: event.first, rows: event.rows, page: event.page + 1 }));
    };

    const imageBodyTemplate = (rowData) => {
        return (
            <div className="d-flex align-items-center">
                {rowData.full_image_url ? (
                    <img src={rowData.full_image_url} alt={rowData.card_name} className="rounded" style={{ width: '40px', height: 'auto', objectFit: 'contain' }} />
                ) : (
                    <div className="bg-light rounded d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px' }}>
                        <i className="ri-image-line text-muted fs-20"></i>
                    </div>
                )}
            </div>
        );
    };

    const nameBodyTemplate = (rowData) => {
        return (
            <Link to={`/vendor-accounts/${rowData.id}`} className="fw-medium link-primary">
                {rowData.card_name}
            </Link>
        );
    };

    const referenceBodyTemplate = (rowData) => {
        return rowData.reference_url ? (
            <a href={rowData.reference_url} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-soft-info py-1 px-2 border-0">
                <i className="ri-external-link-line me-1"></i> Link
            </a>
        ) : '-';
    };

    const actionBodyTemplate = (rowData) => {
        return (
            <div className="d-flex gap-2 justify-content-end">
                <button className="btn btn-soft-primary btn-sm" onClick={() => navigate(`/vendor-accounts/${rowData.id}`)}>
                    <i className="ri-edit-line"></i>
                </button>
                <button className="btn btn-soft-danger btn-sm" onClick={() => handleDelete(rowData.id)}>
                    <i className="ri-delete-bin-line"></i>
                </button>
            </div>
        );
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this account?')) return;
        try {
            await deleteVendorAccount(id);
            toast.success('Account deleted successfully');
            loadData();
        } catch (err) {
            toast.error('Failed to delete account');
        }
    };

    return (
        <div className="page-content">
            <div className="container-fluid">
                <div className="row pb-1 page-subheader-sticky bg-body">
                    <div className="col-12">
                        <div className="d-flex align-items-center justify-content-between flex-row py-2">
                            <div className="flex-grow-1">
                                <h4 className="fs-20 mb-1">Vendor Accounts</h4>
                                <nav aria-label="breadcrumb">
                                    <ol className="breadcrumb m-0">
                                        <li className="breadcrumb-item"><Link to="/">Dashboard</Link></li>
                                        <li className="breadcrumb-item">Credit Builder</li>
                                        <li className="breadcrumb-item active">Vendor Accounts</li>
                                    </ol>
                                </nav>
                            </div>
                            <div className="mt-0">
                                <Link to="/vendor-accounts/create" className="btn btn-primary fw-medium waves-effect waves-light">
                                    <i className="ri-add-fill me-1 align-bottom"></i> Add Account
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="row">
                    <div className="col-12">
                        <div className="card shadow-none border">
                            <div className="card-body p-0">
                                {loading ? (
                                    <div className="p-4">
                                        <TableLoader rows={5} columns={[{ style: { width: '8%' } }, { style: { width: '25%' } }, { style: { width: '15%' } }, { style: { width: '10%' } }, { style: { width: '10%' } }, { style: { width: '12%' } }, { style: { width: '10%' } }, { style: { width: '10%' } }]} />
                                    </div>
                                ) : (
                                    <DataTable
                                        value={accounts}
                                        paginator
                                        rows={lazyParams.rows}
                                        totalRecords={totalRecords}
                                        lazy
                                        onPage={onPage}
                                        className="p-datatable-sm custom-datatable"
                                        tableStyle={{ minWidth: '80rem' }}
                                        dataKey="id"
                                        responsiveLayout="scroll"
                                    >
                                        <Column header="Image" body={imageBodyTemplate} style={{ width: '80px' }} />
                                        <Column field="card_name" header="Name" body={nameBodyTemplate} sortable style={{ width: '20%' }} />
                                        <Column field="issuer" header="Issuer" sortable style={{ width: '15%' }} />
                                        <Column field="typical_personal_fico_min" header="Personal_FICO_Min" sortable style={{ width: '12%' }} />
                                        <Column field="typical_personal_fico_ideal" header="Personal_FICO_Ideal" sortable style={{ width: '12%' }} />
                                        <Column field="time_in_business_min_months" header="Business_Min_Months" sortable style={{ width: '15%' }} />
                                        <Column header="Action" body={actionBodyTemplate} style={{ width: '120px', textAlign: 'right' }} />
                                    </DataTable>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
