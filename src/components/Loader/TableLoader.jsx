import React from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';

/**
 * @param {Object} props
 * @param {number} [props.rows=8]
 * @param {number | Array<{ style?: object, headerStyle?: object }>} [props.columns=6]
 * @param {boolean} [props.showHeader=true]
 */
export default function TableLoader({ rows = 8, columns = 6, showHeader = true }) {

    // Create skeleton data for rows
    const skeletonItems = Array.from({ length: rows }, (_, i) => ({ id: i }));

    const skeletonBody = () => {
        return <div className="skeleton-line w-100 skeleton-table-cell"></div>;
    };

    const headerBody = () => {
        return showHeader ? <div className="skeleton-line skeleton-table-header" style={{ width: '60%' }}></div> : null;
    };

    // Create column definitions
    let columnDefinitions;

    if (Array.isArray(columns)) {
        columnDefinitions = columns.map((col, i) => (
            <Column
                key={i}
                body={skeletonBody}
                header={headerBody}
                style={col.style}
                headerStyle={col.headerStyle}
            />
        ));
    } else {
        columnDefinitions = Array.from({ length: columns }, (_, i) => (
            <Column
                key={i}
                body={skeletonBody}
                header={headerBody}
            />
        ));
    }

    return (
        <div className="table-responsive table-card mt-1 fade-panel">
            <DataTable
                scrollable
                scrollHeight="flex"
                value={skeletonItems}
                className="p-datatable-sm"
                showGridlines={false}
                stripedRows={false}
            >
                {columnDefinitions}
            </DataTable>
        </div>
    );
}
