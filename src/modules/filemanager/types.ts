export interface FileSystemItem {
  name: string
  isDirectory: boolean
  path: string
  updatedAt: string
  size?: number
  type?: string
  url?: string
  file?: File
  documentId?: number // For borrower document deletion
  children?: FileSystemItem[] // For folder tree
}

export interface DocumentsResponse {
  status: boolean
  message: string
  data: FileSystemItem[]
}

export interface UploadFileResponse {
  status: boolean
  message: string
  data: FileSystemItem
}

export interface CreateFolderResponse {
  status: boolean
  message: string
  data: FileSystemItem
}

export interface RenameItemResponse {
  status: boolean
  message: string
  data: FileSystemItem
}

export interface DeleteItemsResponse {
  status: boolean
  message: string
  success: boolean
}

export interface PasteItemsResponse {
  status: boolean
  message: string
  data: FileSystemItem[]
}

export interface FileManagerContext {
  entity_type?: string
  entity_id?: number | string
}

export interface FolderTreeResponse {
  data: FileSystemItem[]
}
