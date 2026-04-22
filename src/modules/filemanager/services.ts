import { apiClient } from '../../lib/http/apiClient'
import type {
  FileSystemItem,
  DocumentsResponse,
  UploadFileResponse,
  CreateFolderResponse,
  RenameItemResponse,
  DeleteItemsResponse,
  PasteItemsResponse,
  FolderTreeResponse,
  FileManagerContext
} from './types'

const BASE_URL = '/filemanager'

export const fetchDocuments = async (path: string = '/', context?: FileManagerContext): Promise<FileSystemItem[]> => {
  const body: any = {
    path,
    entity_type: context?.entity_type ?? '',
    entity_id: context?.entity_id ?? '',
    get_all: context?.get_all ?? false
  }

  const { data } = await apiClient.post<DocumentsResponse>(`${BASE_URL}/list`, body)
  return data.data
}

export const uploadFile = async (file: File, path: string, onProgress?: (progress: number) => void, context?: FileManagerContext): Promise<FileSystemItem> => {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('path', path)
  if (context?.entity_type) formData.append('entity_type', context.entity_type)
  if (context?.entity_id) formData.append('entity_id', String(context.entity_id))
  if (context?.get_all) formData.append('get_all', String(context.get_all))
  if (context?.get_all !== undefined) formData.append('get_all', String(context.get_all))

  const { data } = await apiClient.post<UploadFileResponse>(`${BASE_URL}/upload`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total)
        onProgress(percentCompleted)
      }
    }
  })
  return data.data
}

export const createFolder = async (name: string, path: string, context?: FileManagerContext): Promise<FileSystemItem> => {
  const { data } = await apiClient.post<CreateFolderResponse>(`${BASE_URL}/folder`, {
    name,
    path: path === '/' ? null : path,
    ...context
  })
  return data.data
}

export const renameItem = async (path: string, newName: string, context?: FileManagerContext): Promise<FileSystemItem> => {
  const { data } = await apiClient.put<RenameItemResponse>(`${BASE_URL}/rename`, {
    path,
    newName,
    ...context
  })
  return data.data
}

export const deleteItems = async (paths: string[], context?: FileManagerContext): Promise<boolean> => {
  const { data } = await apiClient.post<DeleteItemsResponse>(`${BASE_URL}/delete`, {
    paths,
    ...context
  })
  return data.success
}

export const pasteItems = async (files: FileSystemItem[], destinationPath: string, operation: 'copy' | 'move', context?: FileManagerContext): Promise<FileSystemItem[]> => {
  const { data } = await apiClient.post<PasteItemsResponse>(`${BASE_URL}/paste`, {
    files,
    destinationPath,
    operation,
    ...context
  })
  return data.data
}

export const downloadFile = async (path: string, filename: string): Promise<void> => {
  try {
    const response = await apiClient.post(
      `${BASE_URL}/download`,
      { path },
      { responseType: 'blob' }
    )

    // Create a blob URL and trigger download
    const blob = new Blob([response.data])
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  } catch (error) {
    console.error('Download failed:', error)
    throw error
  }
}

export const fetchFolderTree = async (path: string = '/', context?: FileManagerContext): Promise<FileSystemItem[]> => {
  const body: any = {
    path,
    entity_type: context?.entity_type ?? '',
    entity_id: context?.entity_id ?? '',
    get_all: context?.get_all ?? false
  }

  const { data } = await apiClient.post<FolderTreeResponse>(`${BASE_URL}/tree`, body)
  return data.data
}

export const attachFiles = async (files: string[], documentTypeId: number): Promise<any> => {
  const { data } = await apiClient.post(`${BASE_URL}/upload-file`, {
    files,
    document_type_id: documentTypeId
  })
  return data
}

export const submitFileSelection = async (files: string[], endpoint: string, payload: Record<string, any> = {}): Promise<any> => {
  const { data } = await apiClient.post(endpoint, {
    files,
    ...payload
  })
  return data
}
