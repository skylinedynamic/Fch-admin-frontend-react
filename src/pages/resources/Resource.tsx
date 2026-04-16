import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { UncontrolledDropdown, DropdownToggle, DropdownMenu, DropdownItem } from 'reactstrap';
import { Skeleton } from 'primereact/skeleton';
import {
  useGroupedResources,
  useCreateResource,
  useUpdateResource,
  useDeleteResource
} from '../../modules/resource/queries';
import { ResourceItem } from '../../modules/resource/types';
import ResourceModal from './ResourceModal';
import DeleteConfirmationModal from '../../components/Common/Modals/DeleteConfirmationModal';
import { toast } from 'react-toastify';

const SkeletonLoader = () => (
    <div className="page-content" style={{ backgroundColor: '#f4f6f9' }}>
      <div className="container-fluid">
        <div className="row mb-4 pt-2">
            <div className="col-12"><Skeleton height="35px" width="200px" className="mb-2" /><Skeleton height="20px" width="150px" /></div>
        </div>
        <div className="row g-3 mb-4">
          {[1, 2, 3, 4].map((i) => (
            <div className="col-md-3" key={i}><Skeleton height="90px" borderRadius="12px" /></div>
          ))}
        </div>
        <div className="row g-4">
          <div className="col-md-8">
            <div className="row g-4">
                {[1, 2].map((i) => (
                    <div className="col-md-6" key={i}><Skeleton height="400px" borderRadius="16px" /></div>
                ))}
                <div className="col-12"><Skeleton height="250px" borderRadius="16px" /></div>
            </div>
          </div>
          <div className="col-md-4">
            <Skeleton height="600px" borderRadius="16px" />
          </div>
        </div>
      </div>
    </div>
  );

const Resource: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAllVideos, setShowAllVideos] = useState(false);

  // Data fetching and mutation
  const { data: groupedData, isLoading } = useGroupedResources();
  const deleteMutation = useDeleteResource();

  const resources = groupedData?.data || {};

  // Modals state
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingResource, setEditingResource] = useState<ResourceItem | null>(null);
  const [activeType, setActiveType] = useState<string>('legal_registration');

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [resourceToDelete, setResourceToDelete] = useState<ResourceItem | null>(null);

  // Handlers
  const handleEdit = (e: React.MouseEvent, resource: ResourceItem, type: string) => {
    e.stopPropagation();
    setEditingResource(resource);
    setActiveType(type);
    setShowFormModal(true);
  };

  const handleAddNew = (type: string) => {
    setEditingResource(null);
    setActiveType(type);
    setShowFormModal(true);
  };

  const handleDeleteClick = (e: React.MouseEvent, resource: ResourceItem) => {
    e.stopPropagation();
    setResourceToDelete(resource);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!resourceToDelete) return;
    try {
      await deleteMutation.mutateAsync(resourceToDelete.id);
      toast.success('Resource deleted successfully');
      setShowDeleteModal(false);
      setResourceToDelete(null);
    } catch (err) {
      toast.error('Failed to delete resource');
    }
  };

  const handleItemClick = (item: ResourceItem) => {
    if (item.file_url) window.open(item.file_url, '_blank');
    else if (item.link) window.open(item.link, '_blank');
  };

  const ActionMenu = ({ item, type }: { item: ResourceItem, type: string }) => (
    <div className="flex-shrink-0" onClick={e => e.stopPropagation()}>
        <UncontrolledDropdown strategy="fixed">
            <DropdownToggle tag="button" className="btn btn-sm btn-icon btn-light bg-transparent border-0 shadow-none px-1 py-0 m-0 text-muted transition-all">
                <i className="ri-more-2-fill fs-18"></i>
            </DropdownToggle>
            <DropdownMenu container="body" className="dropdown-menu-end shadow border-light" style={{ minWidth: '150px', zIndex: 1060 }}>
                <DropdownItem className="fw-medium fs-13 text-secondary py-2" onClick={(e) => handleEdit(e, item, type)}>
                    <i className="ri-pencil-line me-2 align-bottom text-muted"></i> Edit Item
                </DropdownItem>
                <DropdownItem className="fw-medium fs-13 text-danger py-2" onClick={(e) => handleDeleteClick(e, item)}>
                    <i className="ri-delete-bin-line me-2 align-bottom text-danger"></i> Delete
                </DropdownItem>
            </DropdownMenu>
        </UncontrolledDropdown>
    </div>
  );

  const SectionHeader = ({ title, type }: { title: string, type: string }) => (
    <div className="d-flex align-items-center justify-content-between">
      <h6 className="fw-bold text-dark mb-0 fs-15">{title}</h6>
      <button className="btn btn-sm btn-soft-primary px-2 py-1 fs-12 fw-medium d-flex align-items-center shadow-sm hover-up" onClick={() => handleAddNew(type)}>
        <i className="ri-add-line fs-14 me-1"></i> Add New
      </button>
    </div>
  );

  // Filters
  const filteredEdu = (resources.education_help || []).filter(item =>
    item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.subtitle && item.subtitle.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredDocs = (resources.download_assets || []).filter(item =>
    item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.subtitle && item.subtitle.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const trainingVideos = resources.training_academy || [];
  const visibleVideos = showAllVideos ? trainingVideos : trainingVideos.slice(0, 6);

  // Calculate totals array for metric header
  const totalResources = Object.values(resources).reduce((sum, arr) => sum + (arr as any[]).length, 0);

  if (isLoading) {
    return <SkeletonLoader />;
  }

  return (
    <div className="page-content" style={{ backgroundColor: '#f4f6f9' }}>
      <div className="container-fluid">

        {/* Standard Sticky Subheader */}
        <div className="row page-subheader-sticky bg-body">
          <div className="col-12">
            <div className="d-flex align-items-center justify-content-between flex-row py-2">
              <div className="flex-grow-1">
                <h4 className="fs-20 mb-1">Resources</h4>
                <nav aria-label="breadcrumb" className="d-none d-sm-block">
                  <ol className="breadcrumb m-0">
                    <li className="breadcrumb-item"><Link to="/">Dashboard</Link></li>
                    <li className="breadcrumb-item active fw-medium" aria-current="page">Resources</li>
                  </ol>
                </nav>
              </div>
            </div>
          </div>
        </div>

        {/* Metric Header */}
        <div className="row g-3">
          {[
            { label: 'Total Resources', value: totalResources, icon: 'ri-grid-fill', color: 'primary' },
            { label: 'Service Providers', value: (resources.business_services || []).length, icon: 'ri-briefcase-fill', color: 'primary' },
            { label: 'Categories Covered', value: '5', icon: 'ri-stack-fill', color: 'warning' },
            { label: 'Training Videos', value: trainingVideos.length, icon: 'ri-youtube-fill', color: 'primary' }
          ].map((stat, i) => (
            <div className="col-md-3" key={i}>
              <div className="card shadow-sm border-0 rounded-2 bg-white card-animate h-100">
                <div className="card-body py-3 px-4 d-flex align-items-center animate-blur-in" style={{ animationDelay: `${i * 0.1}s` }}>
                  <div className={`avatar-md rounded d-flex align-items-center justify-content-center me-3 shadow-none`}>
                    <i className={`${stat.icon} text-${stat.color} resource-card-icon`}></i>
                  </div>
                  <div>
                    <p className="text-muted mb-0 fs-13 fw-medium text-uppercase tracking-tight">{stat.label}</p>
                    <h4 className="mb-0 fw-bold text-dark fs-22 lh-1">{stat.value}</h4>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="row g-4 mt-1">
          <div className="col-lg-8">
            <div className="row g-4">

              {/* Category Sections */}
              <div className="col-md-6">
                <div className="card shadow-sm border-0 rounded-2 h-100 bg-white">
                  <div className="card-header bg-transparent border-0 pt-4 px-4 pb-2">
                    <SectionHeader title="Legal & Registration" type="legal_registration" />
                  </div>
                  <div className="card-body p-4 pt-2">
                    <div className="d-flex flex-column gap-3">
                      {(resources.legal_registration || []).map((item, i) => (
                        <div className="p-3 rounded-2 border border-light-subtle d-flex align-items-center luxe-item transition-all cursor-pointer shadow-none" key={item.id} onClick={() => handleItemClick(item)}>
                          <div className="flex-shrink-0 avatar-xs bg-light rounded d-flex align-items-center justify-content-center me-3 luxe-icon">
                            <i className={`${item.icon || 'ri-article-line'} text-indigo fs-16`}></i>
                          </div>
                          <div className="flex-grow-1">
                            <h6 className="mb-1 fw-bold fs-14 text-dark lh-sm">{item.title}</h6>
                            <span className="text-muted fs-11">{item.subtitle}</span>
                          </div>
                          <ActionMenu item={item} type="legal_registration" />
                        </div>
                      ))}
                      {(resources.legal_registration || []).length === 0 && (
                          <div className="text-center py-4 text-muted"><p className="mb-0 fs-13">No items yet</p></div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-md-6">
                <div className="card shadow-sm border-0 rounded-2 h-100 bg-white">
                  <div className="card-header bg-transparent border-0 pt-4 px-4 pb-2">
                    <SectionHeader title="Business Services" type="business_services" />
                  </div>
                  <div className="card-body p-4 pt-2">
                    <div className="d-flex flex-column gap-3">
                      {(resources.business_services || []).map((item, i) => (
                        <div className="p-3 rounded-2 border border-light-subtle d-flex align-items-center luxe-item-success transition-all cursor-pointer shadow-none" key={item.id} onClick={() => handleItemClick(item)}>
                          <div className="flex-shrink-0 avatar-xs bg-light rounded d-flex align-items-center justify-content-center me-3 luxe-icon">
                            <i className={`${item.icon || 'ri-phone-circle-line'} text-success fs-16`}></i>
                          </div>
                          <div className="flex-grow-1">
                            <h6 className="mb-1 fw-bold fs-14 text-dark lh-sm">{item.title}</h6>
                            <span className="text-muted fs-11">{item.subtitle}</span>
                          </div>
                          <ActionMenu item={item} type="business_services" />
                        </div>
                      ))}
                      {(resources.business_services || []).length === 0 && (
                          <div className="text-center py-4 text-muted"><p className="mb-0 fs-13">No items yet</p></div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Education Library - Search Field Moved Here */}
              <div className="col-12 mt-4">
                <div className="card shadow-sm border-0 rounded-2 bg-white mb-0 overflow-hidden">
                  <div className="card-header border-0 bg-navy p-4">
                    <div className="d-flex align-items-center justify-content-between gap-3">
                      <div className="flex-grow-1">
                        <h5 className="fw-bold text-white mb-1">Education & Help</h5>
                        <p className="text-white opacity-50 mb-0 fs-13">Detailed library of borrower education guides, credit building tips, and FAQs.</p>
                      </div>
                      <div className="d-flex align-items-center gap-2">
                          <div className="search-box-premium position-relative" style={{ minWidth: '280px' }}>
                            <i className="ri-search-2-line text-white opacity-50 fs-16 position-absolute top-50 start-0 translate-middle-y ms-3"></i>
                            <input
                              type="text"
                              className="form-control bg-white bg-opacity-10 border-white border-opacity-20 rounded-pill ps-5 py-2 fs-13 text-white shadow-none focus-indigo-glow transition-all placeholder-white-50"
                              placeholder="Search Education & Help..."
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                            />
                          </div>
                          <button className="btn btn-outline-light rounded-pill px-4 fw-medium d-flex align-items-center transition-all hover-white" onClick={() => handleAddNew('education_help')}>
                              <i className="ri-add-line me-1 fs-16"></i> Add
                          </button>
                      </div>
                    </div>
                  </div>
                  <div className="card-body p-4 pt-4 bg-light">
                    <div className="row g-3">
                      {filteredEdu.length > 0 ? filteredEdu.map((edu, i) => (
                        <div className="col-6 col-md-4 col-xl-3" key={edu.id}>
                          <div className="p-3 bg-white rounded-2 text-center edu-box-premium transition-all shadow-sm cursor-pointer border-0 h-100 position-relative" onClick={() => handleItemClick(edu)}>
                            <div className="position-absolute top-0 end-0 p-2">
                                <ActionMenu item={edu} type="education_help" />
                            </div>
                            <div className={`avatar-sm bg-primary-subtle rounded d-flex align-items-center justify-content-center mx-auto mb-2 mt-2`}>
                              <i className={`${edu.icon || 'ri-lightbulb-flash-line'} text-primary fs-20`}></i>
                            </div>
                            <h6 className="mb-1 fw-bold fs-13 text-dark mt-3">{edu.title}</h6>
                            <p className="text-muted fs-11 mb-0">{edu.subtitle}</p>
                          </div>
                        </div>
                      )) : (
                          <div className="col-12 py-4 text-center">
                              <p className="text-muted mb-0">No education resources match your search.</p>
                          </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-lg-4">
            <div className="d-flex flex-column gap-4">

              {/* Asset Sidebar */}
              <div className="card shadow-sm border-0 rounded-2 bg-white mb-0">
                <div className="card-header border-bottom border-light p-3">
                    <SectionHeader title="Download Assets" type="download_assets" />
                </div>
                <div className="card-body p-0">
                  <div className="list-group list-group-flush">
                    {filteredDocs.map((doc, i) => (
                      <div className="list-group-item list-group-item-action border-bottom border-light p-3 transition-all d-flex align-items-center justify-content-between cursor-pointer" key={doc.id} onClick={() => handleItemClick(doc)}>
                        <div className="d-flex align-items-center pe-3">
                          <i className={`${doc.icon || 'ri-file-list-3-line'} text-danger fs-20 me-3`}></i>
                          <h6 className="mb-0 fs-13 fw-semibold text-dark">{doc.title}</h6>
                        </div>
                        <div className="d-flex align-items-center">
                            <i className="ri-download-2-line text-muted fs-14 me-2"></i>
                            <ActionMenu item={doc} type="download_assets" />
                        </div>
                      </div>
                    ))}
                    {filteredDocs.length === 0 && (
                          <div className="text-center py-4 text-muted"><p className="mb-0 fs-13">No items yet</p></div>
                    )}
                  </div>
                </div>
              </div>

              {/* Training Academy */}
              <div className="card shadow-sm border-0 rounded-2 bg-white animate-fade-in-right mb-0">
                <div className="card-header border-bottom border-light p-3 d-flex align-items-center justify-content-between">
                  <div className="d-flex align-items-center gap-2">
                      <i className="ri-youtube-fill text-danger fs-20"></i>
                      <h6 className="fw-bold text-dark mb-0 fs-15">Training Academy</h6>
                  </div>
                  <div className="d-flex align-items-center gap-2">
                    <span className="badge bg-danger-subtle text-danger fs-10">{trainingVideos.length} Videos</span>
                    <button className="btn btn-sm btn-soft-danger px-2 py-1 fs-12 fw-medium shadow-none hover-up" onClick={() => handleAddNew('training_academy')}>
                        <i className="ri-add-line align-bottom"></i> Add
                    </button>
                  </div>
                </div>
                <div className="card-body p-4 pt-3 bg-light rounded-bottom">
                  <div className="d-flex flex-column gap-3">
                    {visibleVideos.map((video, i) => (
                      <div className="video-item d-flex align-items-center gap-3 cursor-pointer group bg-white p-2 rounded-2 shadow-sm border border-transparent hover-border-primary" key={video.id} onClick={() => handleItemClick(video)}>
                        <div className="video-thumb position-relative rounded-2 flex-shrink-0 overflow-hidden shadow-sm bg-dark" style={{ width: '100px', height: '64px' }}>
                          <div className="w-100 h-100 bg-primary d-flex align-items-center justify-content-center">
                            <i className="ri-video-line text-white opacity-25" style={{ fontSize: '2rem' }}></i>
                          </div>
                          <div className="bg-overlay-dark position-absolute top-0 start-0 w-100 h-100 bg-dark opacity-25"></div>
                          <i className="ri-play-circle-fill text-white fs-28 position-absolute top-50 start-50 translate-middle z-1 mb-0 transition-all play-icon"></i>
                          <span className="position-absolute bottom-0 end-0 bg-dark bg-opacity-75 text-white fs-9 px-1 rounded-1 m-1 fw-semibold text-uppercase">Watch</span>
                        </div>
                        <div className="flex-grow-1 overflow-hidden d-flex flex-column justify-content-center h-100 pt-1">
                          <div className="d-flex justify-content-between align-items-start">
                            <h6 className="mb-0 fs-13 fw-bold text-dark lh-sm transition-all video-title multi-line-truncate pe-2">{video.title}</h6>
                            <ActionMenu item={video} type="training_academy" />
                          </div>
                          <div className="d-flex align-items-center gap-1 opacity-75 mt-1">
                            <span className="fs-10 text-muted text-truncate">{video.subtitle}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                    {trainingVideos.length === 0 && (
                          <div className="text-center py-4 text-muted"><p className="mb-0 fs-13 text-muted">No videos available.</p></div>
                    )}
                  </div>

                  {!showAllVideos && trainingVideos.length > 6 && (
                    <div className="mt-4 pt-2 border-top border-light text-center">
                      <button
                        className="btn btn-link btn-sm text-secondary p-0 fw-bold text-decoration-none hover-indigo"
                        onClick={() => setShowAllVideos(true)}
                      >
                        Load More Videos <i className="ri-arrow-down-s-line align-middle"></i>
                      </button>
                    </div>
                  )}

                  <button className="btn btn-outline-danger btn-sm w-100 rounded-2 mt-4 fw-bold border-dashed shadow-sm">
                    <i className="ri-notification-3-line me-1"></i> Subscribe to Channel
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* Reused Modals */}
      <ResourceModal 
          key={editingResource?.id || 'new'}
          show={showFormModal} 
          onHide={() => setShowFormModal(false)}
          resource={editingResource}
          type={activeType}
      />
      
      <DeleteConfirmationModal
          show={showDeleteModal}
          onConfirm={confirmDelete}
          onClose={() => setShowDeleteModal(false)}
          loading={deleteMutation.isPending}
          text={`Are you sure you want to delete "${resourceToDelete?.title}"?`}
      />

      <style>{`
        .bg-indigo { background: #4b38b3; }
        .text-indigo { color: #4b38b3 !important; }
        .bg-indigo-subtle { background: rgba(75, 56, 179, 0.12); }
        .bg-success-subtle { background: rgba(10, 179, 156, 0.12); }
        .bg-danger-subtle { background: rgba(240, 101, 72, 0.12); }
        .bg-warning-subtle { background: rgba(247, 184, 75, 0.12); }
        .bg-primary-subtle { background: rgba(75, 56, 179, 0.12); }
        .bg-navy { background: #1a1e4a; }
        
        .placeholder-white-50::placeholder { color: rgba(255, 255, 255, 0.5); }
        
        .luxe-item:hover { background: #f8faff; border-color: #4b38b3 !important; }
        .luxe-item-success:hover { background: #f0fdf4; border-color: #0ab39c !important; }
        .edu-box-premium:hover { transform: translateY(-4px); border-color: rgba(75, 56, 179, 0.3) !important; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
        
        .video-item:hover .play-icon { transform: translate(-50%, -50%) scale(1.1); color: #f06548 !important; }
        .video-item:hover .video-title { color: #4b38b3 !important; text-decoration: underline; }
        .object-cover { object-fit: cover; }
        .hover-border-primary:hover { border-color: rgba(75,56,179, 0.2) !important; }

        .hover-up:hover { transform: translateY(-2px); }
        
        .multi-line-truncate {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .resource-card-icon{
          font-size: 45px !important;
        }

        .hover-indigo:hover { color: #4b38b3 !important; }
        .tracking-tight { letter-spacing: -0.01em; }

        @keyframes blurIn { from { opacity: 0; filter: blur(5px); } to { opacity: 1; filter: blur(0); } }
        .animate-blur-in { animation: blurIn 0.5s ease-out; }

        .transition-all { transition: all 0.25s ease; }
        .tracking-widest { letter-spacing: 0.1em; }
        .card-animate:hover { transform: translateY(-5px); box-shadow: 0 10px 25px rgba(0,0,0,0.1); }
      `}</style>
    </div>
  );
};

export default Resource;
