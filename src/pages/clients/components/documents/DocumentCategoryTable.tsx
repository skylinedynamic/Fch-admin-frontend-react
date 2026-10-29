import React, { useState } from 'react';
import { getFileConfig } from '../../../../config/fileTypeConfig';
import type { ClientDocument, DocumentCategoryGroup, DocumentCategoryState } from '../../../../utils/documentCategories';

/** How each category state reads in its header row. */
export const CATEGORY_STATE_LOOK: Record<DocumentCategoryState, { label: string; icon: string }> = {
    accepted: { label: 'Accepted', icon: 'ri-checkbox-circle-fill' },
    review: { label: 'In review', icon: 'ri-time-line' },
    reupload: { label: 'Re-upload needed', icon: 'ri-error-warning-fill' },
    missing: { label: 'Missing', icon: 'ri-file-upload-line' },
};

const COLUMNS = 6;

interface DocumentCategoryTableProps {
    categories: DocumentCategoryGroup[];
    canUpload: boolean;
    onUpload: (typeId: number) => void;
    onDownload: (doc: ClientDocument) => void;
    renderStatus: (doc: ClientDocument) => React.ReactNode;
    renderActions: (doc: ClientDocument) => React.ReactNode;
}

/**
 * The client's documents as one table, category by category: a header row per
 * category (name, required or not, where it stands, file count, Upload) that
 * folds its files away, then a row per file. A required category with no file
 * is its header row alone, marked Missing.
 */
export default function DocumentCategoryTable({ categories, canUpload, onUpload, onDownload, renderStatus, renderActions }: DocumentCategoryTableProps) {
    const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
    const toggle = (key: string) => setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));

    return (
        <div className="table-responsive cdoc-table-wrap">
            <table className="table align-middle mb-0 cdoc-table">
                <thead className="table-light text-muted">
                    <tr>
                        <th scope="col">File Name</th>
                        <th scope="col">Doc No.</th>
                        <th scope="col">Size</th>
                        <th scope="col">Uploaded</th>
                        <th scope="col">Status</th>
                        <th scope="col" className="text-end">
                            <span className="visually-hidden">Action</span>
                        </th>
                    </tr>
                </thead>
                {categories.map((group) => {
                    const key = String(group.typeId ?? 'other');
                    const headingId = `cdoc-category-${key}`;
                    const look = CATEGORY_STATE_LOOK[group.state];
                    const isCollapsed = !!collapsed[key];
                    const count = group.documents.length;

                    return (
                        <tbody key={key} className={`cdoc-group is-${group.state}`} aria-labelledby={headingId}>
                            <tr className="cdoc-group-head">
                                {/* Name, tag and count across the file columns; the state under Status, Upload under Action. */}
                                <th scope="rowgroup" colSpan={COLUMNS - 2}>
                                    <div className="cdoc-group-bar">
                                        <button
                                            type="button"
                                            className="cdoc-group-toggle"
                                            aria-expanded={!isCollapsed}
                                            onClick={() => toggle(key)}
                                        >
                                            <i className={`ri-arrow-${isCollapsed ? 'right' : 'down'}-s-line cdoc-group-chevron`} aria-hidden="true"></i>
                                            <span className="cdoc-group-name" id={headingId}>{group.name}</span>
                                        </button>
                                        <span className={`cdoc-tag${group.required ? ' is-required' : ''}`}>{group.required ? 'Required' : 'Optional'}</span>
                                        {count > 0 && <span className="cdoc-group-count">{count} file{count === 1 ? '' : 's'}</span>}
                                    </div>
                                </th>
                                <td>
                                    <span className={`cdoc-state is-${group.state}`}>
                                        <i className={look.icon} aria-hidden="true"></i> {look.label}
                                    </span>
                                </td>
                                <td className="text-end">
                                    {canUpload && group.typeId !== null && (
                                        <button
                                            type="button"
                                            className="cdoc-upload-btn"
                                            onClick={() => onUpload(group.typeId as number)}
                                            aria-label={`Upload to ${group.name}`}
                                            title={`Upload to ${group.name}`}
                                        >
                                            <i className="ri-upload-2-line" aria-hidden="true"></i>
                                        </button>
                                    )}
                                </td>
                            </tr>

                            {!isCollapsed && group.documents.map((doc) => {
                                const fileName = doc.document_namea || doc.document_name;
                                const config = getFileConfig(doc.document_url || doc.file_path || fileName || '');
                                return (
                                    <tr key={doc.id} className="cdoc-file-row">
                                        <td>
                                            <div className="d-flex align-items-center" style={{ minWidth: 0 }}>
                                                <span className={`cdoc-file-icon ${config.bg} ${config.color}`} aria-hidden="true">
                                                    <i className={config.icon}></i>
                                                </span>
                                                <div className="ms-3" style={{ minWidth: 0 }}>
                                                    <a
                                                        href="#"
                                                        className="cdoc-file-name"
                                                        title={fileName}
                                                        onClick={(e) => { e.preventDefault(); onDownload(doc); }}
                                                    >
                                                        {fileName}
                                                    </a>
                                                    {doc.rejection_reason && doc.status === 'Rejected' && (
                                                        <span className="cdoc-file-reason">
                                                            <i className="ri-information-line" aria-hidden="true"></i> {doc.rejection_reason}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="text-muted">{doc.document_number || '-'}</td>
                                        <td className="text-muted">{doc.size || '-'}</td>
                                        <td className="text-muted">{doc.date || '-'}</td>
                                        <td>{renderStatus(doc)}</td>
                                        <td className="text-end">{renderActions(doc)}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    );
                })}
            </table>
        </div>
    );
}
