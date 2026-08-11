import { apiClient } from '../../lib/http/apiClient'
import type { DocumentType, DocumentTypesResponse, BorrowerDocumentsResponse, BorrowerDocumentsData, DeleteDocumentResponse } from './types'

export const fetchDocumentTypes = async (): Promise<DocumentType[]> => {
  const { data } = await apiClient.get<DocumentTypesResponse>('/common/doc-types')
  return data.data
}

export const fetchBorrowerDocuments = async (): Promise<BorrowerDocumentsData> => {
  const { data } = await apiClient.get<BorrowerDocumentsResponse>('/borrower/documents')
  return data.data
}

export const deleteDocument = async (documentId: number): Promise<DeleteDocumentResponse> => {
  const { data } = await apiClient.delete<DeleteDocumentResponse>(`/borrower/documents/${documentId}`)
  return data
}

// Download borrower document (uses the common endpoint accessible to the borrower)
export const downloadBorrowerDocument = async (documentId: string | number): Promise<any> => {
    const response = await apiClient.get(`/common/borrowers-documents/download/${Number(documentId)}`, {
        responseType: 'blob'
    });
    return response;
};
