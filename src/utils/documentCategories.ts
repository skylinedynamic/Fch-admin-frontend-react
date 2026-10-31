import { DOCUMENT_STATUS } from '../config/documentStatus'

/** A client document as the Documents tab lists it (common/borrowers-documents). */
export interface ClientDocument {
    id: number
    document_name: string
    document_namea?: string
    document_number?: string
    type: string
    size: string
    date: string
    created_at?: string
    file_path?: string
    document_url?: string
    status?: string
    rejection_reason?: string
}

/** A document category (common/borrower-document-types). */
export interface ClientDocumentType {
    id: number
    name: string
    sort_order?: number
    /** One of the four categories a client must upload (BorrowerDocType::REQUIRED_NAMES). */
    is_required?: boolean
}

/**
 * Where a category stands, by its files - the same rule as the client's own
 * Documents page (BUG-135):
 *   missing  - no file
 *   reupload - only rejected files: the client must send a new one
 *   review   - a file that isn't rejected, none accepted yet
 *   accepted - at least one file accepted
 */
export type DocumentCategoryState = 'missing' | 'reupload' | 'review' | 'accepted'

export interface DocumentCategoryGroup {
    /** The category id to upload into; null for files whose category is unknown. */
    typeId: number | null
    name: string
    required: boolean
    state: DocumentCategoryState
    documents: ClientDocument[]
}

/** Where files go whose category no longer matches a known one. */
export const OTHER_DOCUMENTS_CATEGORY = 'Other documents'

// Names are compared folded: trimmed, lower case, straight apostrophes.
const fold = (name: string) => name.trim().toLowerCase().replace(/[’‘]/g, "'")

export function categoryState(documents: ClientDocument[]): DocumentCategoryState {
    if (!documents.length) return 'missing'
    if (documents.some((d) => d.status === DOCUMENT_STATUS.ACCEPTED)) return 'accepted'
    return documents.some((d) => d.status !== DOCUMENT_STATUS.REJECTED) ? 'review' : 'reupload'
}

/** Done for the client: a file is accepted or waiting for review. */
export const isCategoryDone = (state: DocumentCategoryState) => state === 'accepted' || state === 'review'

/**
 * The Documents tab, category by category: every required category (even
 * empty, so a missing one shows), then the optional ones that have files, then
 * files of an unknown category. Empty optional categories are listed apart,
 * to upload into.
 */
export function groupDocumentsByCategory(documents: ClientDocument[], types: ClientDocumentType[]) {
    const ordered = [...types].sort((a, b) => (a.sort_order ?? a.id) - (b.sort_order ?? b.id))
    const byType = new Map(ordered.map((t) => [fold(t.name), [] as ClientDocument[]]))
    const unknown: ClientDocument[] = []

    for (const doc of documents) {
        const bucket = byType.get(fold(doc.type || ''))
        if (bucket) bucket.push(doc)
        else unknown.push(doc)
    }

    const group = (t: ClientDocumentType): DocumentCategoryGroup => {
        const docs = byType.get(fold(t.name)) ?? []
        return { typeId: t.id, name: t.name, required: !!t.is_required, state: categoryState(docs), documents: docs }
    }

    const required = ordered.filter((t) => t.is_required).map(group)
    const optional = ordered.filter((t) => !t.is_required).map(group)
    const categories = [
        ...required,
        ...optional.filter((c) => c.documents.length),
        ...(unknown.length
            ? [{ typeId: null, name: OTHER_DOCUMENTS_CATEGORY, required: false, state: categoryState(unknown), documents: unknown }]
            : []),
    ]

    return {
        categories,
        emptyOptional: optional.filter((c) => !c.documents.length).map((c) => ({ id: c.typeId as number, name: c.name })),
        requiredDone: required.filter((c) => isCategoryDone(c.state)).length,
        requiredTotal: required.length,
        counts: {
            accepted: documents.filter((d) => d.status === DOCUMENT_STATUS.ACCEPTED).length,
            review: documents.filter((d) => d.status !== DOCUMENT_STATUS.ACCEPTED && d.status !== DOCUMENT_STATUS.REJECTED).length,
            rejected: documents.filter((d) => d.status === DOCUMENT_STATUS.REJECTED).length,
        },
    }
}
