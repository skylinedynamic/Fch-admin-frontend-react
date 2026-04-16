import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { UncontrolledDropdown, DropdownToggle, DropdownMenu, DropdownItem } from 'reactstrap';
import {
  useGroupedResources,
  useDeleteResource
} from '../../modules/resource/queries';
import { ResourceItem } from '../../modules/resource/types';
import ResourceModal from './ResourceModal';
import DeleteConfirmationModal from '../../components/Common/Modals/DeleteConfirmationModal';
import { toast } from 'react-toastify';

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
  const handleEdit = (resource: ResourceItem, type: string) => {
    setEditingResource(resource);
    setActiveType(type);
    setShowFormModal(true);
  };

  const handleAddNew = (type: string) => {
    setEditingResource(null);
    setActiveType(type);
    setShowFormModal(true);
  };

  const handleDeleteClick = (resource: ResourceItem) => {
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

  const ActionMenu = ({ item, type, iconClass = "ri-more-2-fill" }: { item: ResourceItem, type: string, iconClass?: string }) => (
    <div className="flex-shrink-0" onClick={e => e.stopPropagation()}>
      <UncontrolledDropdown onClick={e => e.stopPropagation()} direction="start">
        <DropdownToggle
          tag="button"
          className="btn btn-sm btn-icon btn-light bg-transparent border-0 shadow-none p-0 m-0 text-dark transition-all"
          onClick={e => e.stopPropagation()}
        >
          <i className={`${iconClass} fs-18`}></i>
        </DropdownToggle>
        <DropdownMenu className="dropdown-menu-end shadow border-light bg-white py-2" style={{ minWidth: '140px', zIndex: 1050 }}>
          <DropdownItem className="fw-bold fs-13 py-2 text-dark" onClick={(e) => { e.stopPropagation(); handleEdit(item, type); }}>
            <i className="ri-pencil-line me-2 align-bottom text-primary fs-15"></i> Edit
          </DropdownItem>
          <DropdownItem className="fw-bold fs-13 text-danger py-2" onClick={(e) => { e.stopPropagation(); handleDeleteClick(item); }}>
            <i className="ri-delete-bin-line me-2 align-bottom text-danger fs-15"></i> Delete
          </DropdownItem>
        </DropdownMenu>
      </UncontrolledDropdown>
    </div>
  );

  // Data Logic
  const educationItems = (resources.education_help || []).map((item, i) => ({
    id: item.id,
    title: item.title,
    sub: item.subtitle,
    icon: item.icon || "ri-lightbulb-flash-line",
    color: i % 4 === 0 ? 'warning' : i % 4 === 1 ? 'primary' : i % 4 === 2 ? 'indigo' : 'info',
    original: item
  }));

  const filteredEdu = educationItems.filter(item =>
    item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.sub && item.sub.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const documentItems = (resources.download_assets || []).map(item => ({
    id: item.id,
    title: item.title,
    type: "PDF",
    color: "danger",
    icon: item.icon || "ri-file-list-3-line",
    original: item
  }));

  const trainingVideos = (resources.training_academy || []).map((item, i) => ({
    id: item.id,
    title: item.title,
    duration: "10:00",
    views: "1k",
    color: i % 2 === 0 ? "#4b38b3" : "#0ab39c",
    original: item
  }));

  const visibleVideos = showAllVideos ? trainingVideos : trainingVideos.slice(0, 6);

  const filteredDocs = documentItems.filter(doc =>
    doc.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) return <div className="page-content" style={{ backgroundColor: '#f4f6f9' }}></div>;

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
            { label: 'Total Resources', value: educationItems.length + documentItems.length + trainingVideos.length, icon: 'ri-grid-fill', color: 'primary' },
            { label: 'Service Providers', value: (resources.business_services || []).length, icon: 'ri-briefcase-fill', color: 'primary' },
            { label: 'Categories Covered', value: '6', icon: 'ri-stack-fill', color: 'warning' },
            { label: 'Quick Tools', value: documentItems.length, icon: 'ri-rocket-2-fill', color: 'primary' }
          ].map((stat, i) => (
            <div className="col-md-3" key={i}>
              <div className="card shadow-sm border-0 rounded-2 bg-white card-animate">
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

        <div className="row g-4">
          <div className="col-lg-8">
            <div className="row g-4">

              {/* Category Sections */}
              <div className="col-md-6">
                <div className="card shadow-sm border-0 rounded-2 h-100 bg-white">
                  <div className="card-header bg-transparent border-0 pt-4 px-4 d-flex align-items-center justify-content-between">
                    <h6 className="fw-bold text-dark mb-0 fs-15">Legal & Registration</h6>
                    <button className="btn btn-sm btn-soft-primary px-3 py-1.5 fs-11 fw-bold border-0" onClick={() => handleAddNew('legal_registration')}>
                      <i className="ri-add-line me-1"></i> Add New
                    </button>
                  </div>
                  <div className="card-body p-4 pt-2">
                    <div className="d-flex flex-column gap-3">
                      {(resources.legal_registration || []).map((item, i) => (
                        <div className="p-3 rounded-2 border border-light-subtle d-flex align-items-center luxe-item transition-all" key={item.id} onClick={() => handleEdit(item, "legal_registration")}>
                          <div className="flex-shrink-0 avatar-xs bg-light rounded d-flex align-items-center justify-content-center me-3 luxe-icon">
                            <i className={`${item.icon || 'ri-article-line'} text-indigo fs-16`}></i>
                          </div>
                          <div className="flex-grow-1 overflow-hidden pe-2">
                            <h6 className="mb-1 fw-bold fs-14 text-dark text-truncate">{item.title}</h6>
                            <span className="text-muted fs-11 text-truncate d-block">{item.subtitle}</span>
                          </div>
                          <ActionMenu item={item} type="legal_registration" iconClass="ri-more-2-fill" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-md-6">
                <div className="card shadow-sm border-0 rounded-2 h-100 bg-white">
                  <div className="card-header bg-transparent border-0 pt-4 px-4 d-flex align-items-center justify-content-between">
                    <h6 className="fw-bold text-dark mb-0 fs-15">Business Services</h6>
                    <button className="btn btn-sm btn-soft-success px-3 py-1.5 fs-11 fw-bold border-0" onClick={() => handleAddNew('business_services')}>
                      <i className="ri-add-line me-1"></i> Add New
                    </button>
                  </div>
                  <div className="card-body p-4 pt-2">
                    <div className="d-flex flex-column gap-3">
                      {(resources.business_services || []).map((item, i) => (
                        <div className="p-3 rounded-2 border border-light-subtle d-flex align-items-center luxe-item-success transition-all" key={item.id} onClick={() => handleEdit(item, 'business_services')}>
                          <div className="flex-shrink-0 avatar-xs bg-light rounded d-flex align-items-center justify-content-center me-3 luxe-icon">
                            <i className={`${item.icon || 'ri-phone-circle-line'} text-success fs-16`}></i>
                          </div>
                          <div className="flex-grow-1 overflow-hidden pe-2">
                            <h6 className="mb-1 fw-bold fs-14 text-dark text-truncate">{item.title}</h6>
                            <span className="text-muted fs-11 text-truncate d-block">{item.subtitle}</span>
                          </div>
                          <ActionMenu item={item} type="business_services" iconClass="ri-more-2-fill" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Education Library - Search Field Moved Here */}
              <div className="col-12">
                <div className="card shadow-sm border-0 rounded-2 bg-white">
                  <div className="card-header border-0 bg-navy p-4">
                    <div className="d-flex align-items-start justify-content-between gap-3">
                      <div className="flex-grow-1">
                        <h5 className="fw-bold text-white mb-2">Education & Help</h5>
                        <p className="text-white opacity-50 mb-0 fs-13">Detailed library of borrower education guides, credit building tips, and FAQs.</p>
                      </div>
                      <div className="d-flex flex-column align-items-end gap-2">
                        {/* <button className="btn btn-sm btn-soft-danger px-3 py-1.5 fs-11 fw-bold border-0" onClick={() => handleAddNew('education_help')}>
                          <i className="ri-add-line me-1"></i> Add New
                        </button> */}
                        <div className="search-box-premium position-relative" style={{ width: '280px' }}>
                          <i className="ri-search-2-line text-white opacity-50 fs-16 position-absolute top-50 start-0 translate-middle-y ms-3"></i>
                          <input
                            type="text"
                            className="form-control bg-white bg-opacity-10 border-white border-opacity-20 rounded-pill ps-5 py-2 fs-13 text-white shadow-none focus-indigo-glow transition-all placeholder-white-50"
                            placeholder="Search Education & Help..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="card-body p-4">
                    <div className="row g-3">
                      {filteredEdu.map((edu, i) => (
                        <div className="col-6 col-md-4 col-xl-3" key={edu.id}>
                          <div className="p-3 rounded-2 text-center edu-box-premium transition-all cursor-pointer h-100 border border-light-subtle position-relative" onClick={() => handleEdit(edu.original, "education_help")}>
                            <div className="position-absolute top-0 end-0 p-1 text-muted">
                              <ActionMenu item={edu.original} type="education_help" />
                            </div>
                            <div className={`avatar-sm bg-${edu.color}-subtle rounded d-flex align-items-center justify-content-center mx-auto mb-2`}>
                              <i className={`${edu.icon} text-${edu.color} fs-20`}></i>
                            </div>
                            <h6 className="mb-1 fw-bold fs-13 text-dark">{edu.title}</h6>
                            <p className="text-muted fs-10 mb-0">{edu.sub}</p>
                          </div>
                        </div>
                      ))}
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
                <div className="card-header border-bottom border-light p-3 d-flex align-items-center justify-content-between">
                  <h6 className="fw-bold text-dark mb-0 fs-14 text-uppercase tracking-wider">Download Assets</h6>
                  <button className="btn btn-sm btn-soft-danger px-3 py-1.5 fs-11 fw-bold border-0" onClick={() => handleAddNew('download_assets')}>
                    <i className="ri-add-line me-1"></i> Add New
                  </button>
                </div>
                <div className="card-body p-0">
                  <div className="list-group list-group-flush">
                    {filteredDocs.map((doc, i) => (
                      <div className="list-group-item list-group-item-action border-0 p-3 transition-all d-flex align-items-center justify-content-between cursor-pointer" key={doc.id} onClick={() => handleEdit(doc.original, "download_assets")}>
                        <div className="d-flex align-items-center flex-grow-1 pe-2">
                          <i className={`${doc.icon} text-${doc.color} fs-20 me-3`}></i>
                          <h6 className="mb-0 fs-13 fw-semibold text-dark text-truncate">{doc.title}</h6>
                        </div>
                        <div className="d-flex align-items-center gap-2">
                          <i className="ri-download-2-line text-muted fs-14"></i>
                          <ActionMenu item={doc.original} type="download_assets" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Training Academy */}
              <div className="card shadow-sm border-0 rounded-2 bg-white animate-fade-in-right">
                <div className="card-header border-bottom border-light p-4 d-flex align-items-center justify-content-between">
                  <div className="d-flex align-items-center gap-2">
                    <h6 className="fw-bold text-dark mb-0 fs-15"><i className="ri-youtube-fill text-danger me-2"></i> Training Academy</h6>
                    <button className="btn btn-sm btn-soft-danger px-3 py-1.5 fs-11 fw-bold border-0 ms-2" onClick={() => handleAddNew('training_academy')}>
                      <i className="ri-add-line me-1"></i> Add New
                    </button>
                  </div>
                  <span className="badge bg-danger-subtle text-danger fs-10">{trainingVideos.length} Videos</span>
                </div>
                <div className="card-body p-4 pt-3">
                  <div className="d-flex flex-column gap-4">
                    {visibleVideos.map((video, i) => (
                      <div className="video-item d-flex align-items-center gap-3 cursor-pointer group" key={video.id} onClick={() => handleEdit(video.original, "training_academy")}>
                        <div className="video-thumb position-relative rounded-2 flex-shrink-0 overflow-hidden shadow-sm" style={{ width: '110px', height: '64px' }}>
                          <img
                            src={video.original.file_url || `https://placehold.co/220x128/${video.color.replace('#', '')}/white?text=Tutorial+${i + 1}`}
                            alt={video.title}
                            className="w-100 h-100 object-cover"
                          />
                          <div className="bg-overlay-dark position-absolute top-0 start-0 w-100 h-100 bg-dark opacity-25"></div>
                          <i className="ri-play-circle-fill text-white fs-28 position-absolute top-50 start-50 translate-middle z-1 mb-0 transition-all play-icon"></i>
                          <span className="position-absolute bottom-0 end-0 bg-dark bg-opacity-75 text-white fs-9 px-1 rounded-1 m-1 fw-semibold">{video.duration}</span>
                        </div>
                        <div className="flex-grow-1 pe-1">
                          <div className="d-flex justify-content-between align-items-start">
                            <h6 className="mb-1 fs-13 fw-bold text-dark lh-base transition-all video-title multi-line-truncate">{video.title}</h6>
                            <ActionMenu item={video.original} type="training_academy" />
                          </div>
                          <div className="d-flex align-items-center gap-1 opacity-75">
                            <span className="fs-10 text-muted">{video.views} views</span>
                            <span className="fs-10 text-muted">•</span>
                            <span className="fs-10 text-muted">Tutorial</span>
                          </div>
                        </div>
                      </div>
                    ))}
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
        
        .metric-accent { position: absolute; top: 0; left: 0; height: 100%; width: 4px; }
        .luxe-item:hover { background: #f8faff; border-color: #4b38b3 !important; }
        .luxe-item-success:hover { background: #f0fdf4; border-color: #0ab39c !important; }
        .edu-box-premium:hover { transform: translateY(-4px); border-color: #4b38b3 !important; }
        
        .video-item:hover .play-icon { transform: translate(-50%, -50%) scale(1.1); color: #f06548 !important; }
        .video-item:hover .video-title { color: #4b38b3 !important; }
        .object-cover { object-fit: cover; }
        
        .multi-line-truncate {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
          .resource-card-icon{
          font-size: 45px !important;}

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
