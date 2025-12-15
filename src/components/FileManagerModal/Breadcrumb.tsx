import React from 'react'
import { HomeIcon, ChevronRightIcon } from './Icons'

interface BreadcrumbProps {
  currentPath: string
  onNavigate: (path: string) => void
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({ currentPath, onNavigate }) => {
  const pathParts = currentPath.split('/').filter(Boolean)

  const handleHomeClick = () => {
    onNavigate('/')
  }

  const handlePartClick = (index: number) => {
    if (index === -1) {
      onNavigate('/')
      return
    }
    const path = '/' + pathParts.slice(0, index + 1).join('/')
    onNavigate(path)
  }

  return (
    <div className="fm-breadcrumb">
      <div
        className={`fm-breadcrumb-item ${currentPath === '/' ? 'active' : ''}`}
        onClick={handleHomeClick}
      >
        <HomeIcon />
        <span>Home</span>
      </div>

      {pathParts.map((part, index) => (
        <React.Fragment key={index}>
          <ChevronRightIcon />
          <div
            className={`fm-breadcrumb-item ${index === pathParts.length - 1 ? 'active' : ''}`}
            onClick={() => handlePartClick(index)}
          >
            <span>{part}</span>
          </div>
        </React.Fragment>
      ))}
    </div>
  )
}
