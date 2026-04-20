import { Link } from 'react-router-dom';
import { usePermissions } from '../../../lib/auth/usePermissions';
import { DataTable } from '../../../components/Table/DataTableWrapper';
import { Column } from 'primereact/column';
import TableLoader from '../../../components/Loader/TableLoader';

export default function EmployeeTable({
    rows,
    loading,
    totalRecords,
    page,
    perPage,
    sortField,
    sortOrder,
    filters,
    selection,
    onSelectionChange,
    onFilter,
    onPage,
    onSort
}) {
    const { hasPermission } = usePermissions();
    // Name column body template
    const nameBody = (rowData) => (
        <Link to={`/employee-details/${rowData.id}`} className="link-primary">
            {rowData.full_name}
        </Link>
    );

    // Status column body template
    const statusBodyTemplate = (rowData) => {
        const value = rowData?.job_status || rowData?.status || '';
        const active = value === 'Active';
        return (
            <span className={`badge ${active ? 'border border-success text-success' : 'border border-danger text-danger'}`}>
                {value || 'Inactive'}
            </span>
        );
    };

    if (loading) {
        return <TableLoader
            rows={12}
            columns={[
                { style: { width: '3rem' } }, // Selection
                { style: { minWidth: '' } }, // Name
                { style: { minWidth: '' } }, // Code
                { style: { minWidth: '' } }, // Phone
                { style: { minWidth: '' } }, // Email
                { style: { minWidth: '' } }, // Department
                { style: { minWidth: '' } }, // Designation
                { style: { minWidth: '' } }  // Status
            ]}
        />;
    }

    return (
        <div className="table-responsive table-card mt-1">
            <DataTable
                scrollable
                scrollHeight="flex"
                value={rows}
                paginator
                lazy
                totalRecords={totalRecords}
                first={(page - 1) * perPage}
                rows={perPage}
                rowsPerPageOptions={[10, 25, 50, 100]}
                sortMode="single"
                sortField={sortField}
                sortOrder={sortOrder === 'asc' ? 1 : -1}
                filterDisplay="menu"
                filters={filters}
                onFilter={onFilter}
                onPage={onPage}
                onSort={onSort}
                globalFilterFields={[
                    'full_name',
                    'employee_code',
                    'phone_number',
                    'email',
                    'department',
                    'designation',
                    'job_status'
                ]}
                selection={selection}
                onSelectionChange={onSelectionChange}
                dataKey="id"
                responsiveLayout="scroll"
                className="p-datatable-sm"
                loading={loading}
                emptyMessage="No employees found"
            >
                {hasPermission('delete employees') && (
                    <Column selectionMode="multiple" headerStyle={{ width: '3rem' }} exportable={false}></Column>
                )}
                <Column field="full_name" header="Employee Name" sortable filter showFilterMatchModes filterPlaceholder="Search name" body={nameBody}></Column>
                <Column field="employee_code" header="Code" sortable filter showFilterMatchModes filterPlaceholder="Search code"></Column>
                <Column field="phone_number" header="Phone" sortable filter showFilterMatchModes filterPlaceholder="(xxx) xxx-xxxx"></Column>
                <Column field="email" header="Email" sortable filter showFilterMatchModes filterPlaceholder="Search email"></Column>
                <Column field="department" header="Department" sortable filter showFilterMatchModes filterPlaceholder="Search department"></Column>
                <Column field="designation" header="Designation" sortable filter showFilterMatchModes filterPlaceholder="Search designation"></Column>
                <Column field="job_status" header="Status" sortable filter showFilterMatchModes filterPlaceholder="Search Status" body={statusBodyTemplate}></Column>
            </DataTable>
        </div>
    );
}
