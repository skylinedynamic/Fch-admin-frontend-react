import React from 'react';
import { Link } from 'react-router-dom';

export interface BreadcrumbItem {
    label: string;
    path?: string;
}

export interface PageHeaderProps {
    title: string;
    breadcrumbs: BreadcrumbItem[];
    children?: React.ReactNode;
    sticky?: boolean;
}

const PageHeader: React.FC<PageHeaderProps> = ({ title, breadcrumbs, children, sticky = true }) => {
    const headerClass = sticky ? "row pb-1 page-subheader-sticky bg-body" : "row pb-1 mobile-sticky-header";

    return (
        <div className={headerClass}>
            <div className="col-12">
                <div className="d-flex align-items-center justify-content-between flex-row py-2">
                    <div className="flex-grow-1" style={{ minWidth: 0 }}>
                        <h4 className="fs-20 mb-1">{title}</h4>
                        <nav aria-label="breadcrumb">
                            <ol className="breadcrumb m-0">
                                <li className="breadcrumb-item">
                                    <Link to="/">Dashboard</Link>
                                </li>
                                {breadcrumbs.map((item, index) => (
                                    <li
                                        key={index}
                                        className={`breadcrumb-item ${!item.path ? 'active' : ''}`}
                                        aria-current={!item.path ? 'page' : undefined}
                                    >
                                        {item.path ? (
                                            <Link to={item.path}>{item.label}</Link>
                                        ) : (
                                            item.label
                                        )}
                                    </li>
                                ))}
                            </ol>
                        </nav>
                    </div>
                    {children && (
                        <div className="page-actions d-flex align-items-center gap-2">
                            {children}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PageHeader;
