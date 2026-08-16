import { Link } from 'react-router-dom';
import { usePermissions } from '../../../lib/auth/usePermissions';
import PageHeader from '../../common/PageHeader';

export default function EmployeeListHeader({ selection, onDeleteSelected }) {
    const { hasPermission } = usePermissions();
    return (
        <PageHeader 
            title="Employees" 
            breadcrumbs={[
                { label: 'Employees' }
            ]} 
        >
                    <div className="mt-0">
                        <form onSubmit={(e) => e.preventDefault()}>
                            <div className="row g-3 mb-0 align-items-center">
                                <div className="col-sm-auto">
                                    <div className="btn-group">
                                        {hasPermission('delete employees') && Array.isArray(selection) && selection.length > 0 ? (
                                            <>
                                                <button type="button" id="primaryActionBtn" className="btn bg-success text-white fw-medium">
                                                    Actions
                                                </button>
                                                <button type="button" id="primaryActionToggleBtn" className="btn bg-success text-white fw-medium dropdown-toggle dropdown-toggle-split" data-bs-toggle="dropdown" aria-expanded="false">
                                                    <span className="visually-hidden">Toggle dropdown</span>
                                                </button>
                                                <ul className="dropdown-menu dropdown-menu-end" id="primaryActionMenu">
                                                    <li>
                                                        <button
                                                            type="button"
                                                            className="dropdown-item text-danger"
                                                            onClick={onDeleteSelected}
                                                        >
                                                            <i className="ri-delete-bin-6-line me-1 align-bottom"></i> Delete Selected
                                                        </button>
                                                    </li>
                                                </ul>
                                            </>
                                        ) : hasPermission('create employees') ? (
                                            <Link to="/employees/create" id="primaryActionBtn" className="btn btn-primary fw-medium waves-effect waves-light">
                                                <i className="ri-add-fill me-1 align-bottom"></i> Add Employee
                                            </Link>
                                        ) : null}
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>
        </PageHeader>
    );
}
