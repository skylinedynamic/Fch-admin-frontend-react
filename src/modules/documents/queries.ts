import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '../../lib/query'
import { fetchDocumentTypes, fetchBorrowerDocuments, deleteDocument } from './services'

export const useDocumentTypes = () => {
  return useQuery({
    queryKey: queryKeys.documents.types(),
    queryFn: fetchDocumentTypes,
  })
}

export const useBorrowerDocuments = () => {
  return useQuery({
    queryKey: queryKeys.documents.list(),
    queryFn: fetchBorrowerDocuments,
  })
}

export const useDeleteDocument = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: deleteDocument,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.documents.list() })
    }
  })
}
