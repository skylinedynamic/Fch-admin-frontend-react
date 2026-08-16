export interface DocumentType {
  id: number
  name: string
  sort_order: number
}

export interface DocumentTypesResponse {
  status: boolean
  message: string
  data: DocumentType[]
}

export interface BorrowerDocument {
  id: number
  borrower_id: number
  document_type_id: number
  file_name: string
  file_path: string
  url: string
}

export interface BorrowerDocumentsData {
  [documentTypeId: string]: BorrowerDocument[]
}

export interface BorrowerDocumentsResponse {
  status: boolean
  message: string
  data: BorrowerDocumentsData
}

export interface DeleteDocumentResponse {
  status: boolean
  message: string
  data: null
}
