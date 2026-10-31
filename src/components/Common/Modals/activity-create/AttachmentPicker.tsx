import { useRef } from 'react'

/** A file already saved on the activity (Edit). */
export interface SavedAttachment {
    name: string
}

interface AttachmentPickerProps {
    files: File[]
    /** Files already saved on the activity, listed before the new ones (Edit). */
    savedFiles?: SavedAttachment[]
    onRemoveSaved?: (index: number) => void
    onAdd: (files: File[]) => void
    onRemove: (index: number) => void
    /** Errors keyed like the API's: "attachments" and "attachments.<index>". */
    errors: Record<string, string[] | undefined>
    label?: string
    /** Element ids, so two modals on one page never share them. */
    inputId?: string
    buttonId?: string
    listId?: string
}

const FILE_ICONS: Record<string, string> = {
    pdf: 'ri-file-pdf-2-line',
    doc: 'ri-file-word-2-line', docx: 'ri-file-word-2-line',
    xls: 'ri-file-excel-2-line', xlsx: 'ri-file-excel-2-line', csv: 'ri-file-excel-2-line',
    ppt: 'ri-file-ppt-2-line', pptx: 'ri-file-ppt-2-line',
    jpg: 'ri-image-line', jpeg: 'ri-image-line', png: 'ri-image-line', gif: 'ri-image-line', webp: 'ri-image-line', svg: 'ri-image-line',
    zip: 'ri-file-zip-line', rar: 'ri-file-zip-line',
    txt: 'ri-file-text-line',
}

const fileIcon = (name: string) => FILE_ICONS[name.split('.').pop()?.toLowerCase() ?? ''] ?? 'ri-file-line'

const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** "Select Attachments": an add button and the chosen files, each removable. */
export default function AttachmentPicker({
    files,
    savedFiles = [],
    onRemoveSaved,
    onAdd,
    onRemove,
    errors,
    label = 'Select Attachments',
    inputId = 'activityAttachmentInput',
    buttonId = 'activityAttachmentBtn',
    listId = 'activityAttachmentList',
}: AttachmentPickerProps) {
    const inputRef = useRef<HTMLInputElement>(null)

    return (
        <div className="acm-field">
            <span className="form-label d-block">{label}</span>
            <button
                type="button"
                id={buttonId}
                className={`acm-attach ${errors.attachments ? 'is-invalid' : ''}`}
                onClick={() => inputRef.current?.click()}
            >
                <span className="acm-attach__icon" aria-hidden="true"><i className="ri-upload-cloud-2-line" /></span>
                <span className="acm-attach__text">Add Attachment</span>
            </button>
            <input
                ref={inputRef}
                type="file"
                id={inputId}
                className="d-none"
                multiple
                onChange={(e) => onAdd(Array.from(e.target.files ?? []))}
            />

            {(files.length > 0 || savedFiles.length > 0) && (
                <ul className="acm-files" id={listId}>
                    {savedFiles.map((file, index) => (
                        <li key={`saved-${file.name}-${index}`} className="acm-files__item">
                            <span className="acm-files__icon" aria-hidden="true"><i className={fileIcon(file.name)} /></span>
                            <span className="acm-files__meta">
                                <span className="acm-files__name" title={file.name}>{file.name}</span>
                                <span className="acm-files__size">Saved</span>
                            </span>
                            {onRemoveSaved && (
                                <button
                                    type="button"
                                    className="acm-files__remove"
                                    aria-label={`Remove ${file.name}`}
                                    onClick={() => onRemoveSaved(index)}
                                >
                                    <i className="ri-close-line" />
                                </button>
                            )}
                        </li>
                    ))}
                    {files.map((file, index) => {
                        const fileError = errors[`attachments.${index}`]
                        return (
                            <li key={`${file.name}-${index}`} className={`acm-files__item ${fileError ? 'is-invalid' : ''}`}>
                                <span className="acm-files__icon" aria-hidden="true"><i className={fileIcon(file.name)} /></span>
                                <span className="acm-files__meta">
                                    <span className="acm-files__name" title={file.name}>{file.name}</span>
                                    {fileError
                                        ? <span className="acm-files__error">{fileError[0]}</span>
                                        : <span className="acm-files__size">{formatSize(file.size)}</span>}
                                </span>
                                <button
                                    type="button"
                                    className="acm-files__remove"
                                    aria-label={`Remove ${file.name}`}
                                    onClick={() => onRemove(index)}
                                >
                                    <i className="ri-close-line" />
                                </button>
                            </li>
                        )
                    })}
                </ul>
            )}
            {errors.attachments && <div className="text-danger mt-1 small">{errors.attachments[0]}</div>}
        </div>
    )
}
