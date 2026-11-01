import React from 'react';
import { addTableColumn, addTableRow, removeTableColumn, removeTableRow } from './utils';

interface TableControlsProps {
    content: string;
    onChange: (content: string) => void;
}

const GROUPS = [
    {
        label: 'Rows',
        actions: [
            { label: 'Add row', icon: 'ri-add-line', edit: addTableRow },
            { label: 'Remove row', icon: 'ri-subtract-line', edit: removeTableRow },
        ],
    },
    {
        label: 'Columns',
        actions: [
            { label: 'Add column', icon: 'ri-add-line', edit: addTableColumn },
            { label: 'Remove column', icon: 'ri-subtract-line', edit: removeTableColumn },
        ],
    },
];

/** Rows and columns of a table block; its cells are edited in the canvas. */
export const TableControls: React.FC<TableControlsProps> = ({ content, onChange }) => (
    <div className="ab4-table-controls">
        <label className="ab4-pl">Table</label>
        {GROUPS.map((group) => (
            <div key={group.label} className="ab4-table-controls__row">
                <span className="ab4-table-controls__label">{group.label}</span>
                <div className="ab4-table-controls__btns">
                    {group.actions.map((action) => (
                        <button
                            key={action.label}
                            type="button"
                            className="ab4-table-controls__btn"
                            aria-label={action.label}
                            title={action.label}
                            onClick={() => onChange(action.edit(content))}
                        >
                            <i className={action.icon} aria-hidden="true" />
                        </button>
                    ))}
                </div>
            </div>
        ))}
    </div>
);
