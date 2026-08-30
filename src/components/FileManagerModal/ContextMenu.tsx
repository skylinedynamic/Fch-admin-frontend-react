import React, { useEffect, useRef } from 'react'
import type { FileSystemItem } from '../../modules/filemanager/types'
import { DownloadIcon, EditIcon, DeleteIcon, CopyIcon, MoveIcon } from './Icons'

interface ContextMenuProps {
  isOpen: boolean
  position: { x: number; y: number }
  selectedItem: FileSystemItem | null
  selectedCount: number
  onClose: () => void
  onDownload: () => void
  onRename: () => void
  onDelete: () => void
  onCopy: () => void
  onMove: () => void
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  isOpen,
  position,
  selectedItem,
  selectedCount,
  onClose,
  onDownload,
  onRename,
  onDelete,
  onCopy,
  onMove
}) => {
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleEscape)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  if (!isOpen || !selectedItem) return null

  return (
    <div
      ref={menuRef}
      className="fm-context-menu"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
    >
      {!selectedItem.isDirectory && (
        <div className="fm-context-menu-item" onClick={() => { onDownload(); onClose(); }}>
          <DownloadIcon />
          <span>Download</span>
        </div>
      )}
      
      {selectedCount === 1 && (
        <div className="fm-context-menu-item" onClick={() => { onRename(); onClose(); }}>
          <EditIcon />
          <span>Rename</span>
        </div>
      )}

      <div className="fm-context-menu-item" onClick={() => { onCopy(); onClose(); }}>
        <CopyIcon />
        <span>Copy</span>
      </div>

      <div className="fm-context-menu-item" onClick={() => { onMove(); onClose(); }}>
        <MoveIcon />
        <span>Move</span>
      </div>

      <div className="fm-context-menu-divider" />

      <div className="fm-context-menu-item danger" onClick={() => { onDelete(); onClose(); }}>
        <DeleteIcon />
        <span>Delete</span>
      </div>
    </div>
  )
}
