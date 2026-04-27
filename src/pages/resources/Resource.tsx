import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UncontrolledDropdown, DropdownToggle, DropdownMenu, DropdownItem, Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';
import {
  useGroupedResources,
  useDeleteResource
} from '../../modules/resource/queries';
import { ResourceItem } from '../../modules/resource/types';
import DeleteConfirmationModal from '../../components/Common/Modals/DeleteConfirmationModal';
import { toast } from 'react-toastify';
import { handleFileDownload } from '../../utils/fileDownload';
import { downloadResource } from '../../modules/resource/services';
import ResourceLoader from '../../components/Loader/ResourceLoader';
import { usePermissions } from '../../lib/auth/usePermissions';
import { useAuthStore } from '../../store/auth/authStore';

const getYoutubeThumbnail = (url: string) => {
  if (!url) return null;
  const regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11)
    ? `https://img.youtube.com/vi/${match[2]}/maxresdefault.jpg`
    : null;
};

const getEmbedUrl = (url: string) => {
  if (!url) return '';
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  if (match && match[2].length === 11) {
    return `https://www.youtube.com/embed/${match[2]}?autoplay=1`;
  }
  return url;
};

const StatusBadge: React.FC<{ status?: boolean | number }> = ({ status }) => (
  <span className={`badge ${status ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'} fs-10 px-2 py-0.5 rounded-pill`}>
    {status ? 'Active' : 'Inactive'}
  </span>
);

const AudienceTags: React.FC<{ item: ResourceItem }> = ({ item }) => (
  <div className="d-flex gap-1">
    {item.is_partner && (
      <span
        className="badge bg-primary-subtle text-primary fs-9 p-0 rounded-circle d-flex align-items-center justify-content-center audience-tag-badge"
        title="Partner"
      >
        P
      </span>
    )}
    {item.is_borrower && (
      <span
        className="badge bg-success-subtle text-success fs-9 p-0 rounded-circle d-flex align-items-center justify-content-center audience-tag-badge"
        title="Borrower"
      >
        B
      </span>
    )}
  </div>
);

const Resource: React.FC = () => {
  const { hasPermission } = usePermissions();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const [searchTerm, setSearchTerm] = useState('');

  // Data fetching and mutation
  const { data: groupedData, isLoading } = useGroupedResources();
  const deleteMutation = useDeleteResource();

  const resources = groupedData?.data || {};

  // Navigation handlers
  const [activeType, setActiveType] = useState<string>('legal_registration');

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [resourceToDelete, setResourceToDelete] = useState<ResourceItem | null>(null);

  // PDF Preview State
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [activePreviewResource, setActivePreviewResource] = useState<ResourceItem | null>(null);

  // Fundability System State
  const [activeFundabilityStep, setActiveFundabilityStep] = useState<any | null>(null);
  const [showFundabilityModal, setShowFundabilityModal] = useState(false);

  const getFundabilityData = (item: ResourceItem) => {
    return {
      title: item.title,
      icon: item.icon || 'ri-briefcase-line',
      color: getColorByIcon(item.icon || ''),
      overview: item.overview && item.overview.length > 0 ? item.overview : [item.subtitle || 'Step-by-step guidance for this business service.'],
      impact: item.impact && item.impact.length > 0 ? item.impact : ['Meeting this requirement significantly enhances your business fundability profile.'],
      providers: item.providers || []
    };
  };

  const handleFundabilityClick = (step: any) => {
    setActiveFundabilityStep(step);
    setShowFundabilityModal(true);
  };

  // Handlers
  const handleEdit = (resource: ResourceItem, type: string) => {
    navigate(`/resources/edit/${resource.id}`);
  };

  const handleAddNew = (type: string) => {
    navigate('/resources/create', { state: { type } });
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

  const handleItemClick = (item: ResourceItem, forceDownload = false) => {
    if (forceDownload && item.id) {
      let extension = 'pdf';
      if (item.file_url) {
        const parts = item.file_url.split('.');
        if (parts.length > 1) {
          extension = parts[parts.length - 1];
        }
      }

      let fileName = item.title || 'document';
      if (!fileName.toLowerCase().endsWith(`.${extension.toLowerCase()}`)) {
        fileName = `${fileName}.${extension}`;
      }

      handleFileDownload(
        () => downloadResource(item.id),
        fileName,
        item.file_url || undefined
      );
      return;
    }

    if (item.link) {
      if (getYoutubeThumbnail(item.link)) {
        setActivePreviewResource(item);
        setShowPdfModal(true);
        return;
      }
      window.open(item.link, '_blank');
      return;
    }

    if (item.file_url) {
      setActivePreviewResource(item);
      setShowPdfModal(true);
    } else {
      toast.info("No file or link available for this item");
    }
  };

  const ActionMenu = ({ item, type, iconClass = "ri-more-2-fill" }: { item: ResourceItem, type: string, iconClass?: string }) => {
    if (!user?.is_host) return null;

    return (
      <div className="flex-shrink-0" onClick={e => e.stopPropagation()}>
        <UncontrolledDropdown onClick={e => e.stopPropagation()}>
          <DropdownToggle
            tag="button"
            className="btn btn-sm btn-icon btn-light bg-transparent border-0 shadow-none p-0 m-0 text-dark transition-all hover-scale"
            onClick={e => e.stopPropagation()}
          >
            <i className={`${iconClass} fs-16 text-muted opacity-100`}></i>
          </DropdownToggle>
          <DropdownMenu className="shadow-lg border-0 bg-white py-2 dropdown-menu-resource" container="body">
            {hasPermission('update resources') && (
              <DropdownItem className="fw-medium fs-13 py-2 text-dark d-flex align-items-center" onClick={(e) => { e.stopPropagation(); handleEdit(item, type); }}>
                <i className="ri-pencil-line me-2 text-primary fs-16"></i> Edit
              </DropdownItem>
            )}
            {item.file_url && (
              <DropdownItem className="fw-medium fs-13 py-2 text-dark d-flex align-items-center" onClick={(e) => { e.stopPropagation(); handleItemClick(item, true); }}>
                <i className="ri-download-2-line me-2 text-success fs-16"></i> Download
              </DropdownItem>
            )}
            {hasPermission('delete resources') && (
              <>
                <div className="dropdown-divider border-top border-light my-1 mx-2"></div>
                <DropdownItem className="fw-medium fs-13 text-danger py-2 d-flex align-items-center" onClick={(e) => { e.stopPropagation(); handleDeleteClick(item); }}>
                  <i className="ri-delete-bin-line me-2 text-danger fs-16"></i> Delete
                </DropdownItem>
              </>
            )}
          </DropdownMenu>
        </UncontrolledDropdown>
      </div>
    );
  };

  const getColorByIcon = (icon: string = '') => {
    if (icon.includes('lightbulb') || icon.includes('warning') || icon.includes('flash')) return 'warning';
    if (icon.includes('government') || icon.includes('folder') || icon.includes('question') || icon.includes('faqs') ||
      icon.includes('honour') || icon.includes('bank') || icon.includes('book') || icon.includes('glossary') || icon.includes('shield')) return 'primary-custom';
    if (icon.includes('building') || icon.includes('wallet') || icon.includes('cash')) return 'info';
    if (icon.includes('delete') || icon.includes('danger') || icon.includes('denial')) return 'danger';
    if (icon.includes('list') || icon.includes('checklist') || icon.includes('excel')) return 'success';
    return 'primary';
  };

  const filterItems = (items: ResourceItem[] | undefined) => {
    if (!items) return [];
    if (!searchTerm) return items;
    return items.filter(item =>
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.subtitle && item.subtitle.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  };

  const colorClass = (c: string) => c === 'primary-custom' ? 'primary-custom' : c;
  const bgClass = (c: string) => c === 'primary-custom' ? 'primary-custom-subtle' : `${c}-subtle`;

  const filteredEdu = filterItems(resources.education_help).map(item => ({
    id: item.id,
    title: item.title,
    sub: item.subtitle,
    file_url: item.file_url,
    icon: item.icon || 'ri-book-line',
    color: getColorByIcon(item.icon || ''),
    original: item
  }));

  const filteredLegal = resources.legal_registration || [];
  const filteredBus = resources.business_services || [];

  const documentItems = (resources.download_assets || []).map(item => ({
    id: item.id,
    title: item.title,
    sub: item.subtitle,
    file_url: item.file_url,
    type: "PDF",
    color: getColorByIcon(item.icon || 'ri-file-list-3-line'),
    icon: item.icon || "ri-file-list-3-line",
    original: item
  }));

  const trainingVideos = (resources.training_academy || []).map((item, i) => ({
    id: item.id,
    title: item.title,
    subtitle: item.subtitle,
    file_url: item.file_url,
    duration: "Tutorial",
    createdAt: item.created_at,
    color: i % 2 === 0 ? "#4b38b3" : "#0ab39c",
    thumbnail: getYoutubeThumbnail(item.link) || item.file_url || `https://placehold.co/220x128/${(i % 2 === 0 ? "#4b38b3" : "#0ab39c")}/white?text=Training`,
    original: item
  }));

  if (!hasPermission('view resources')) {
    return (
      <div className="page-content">
        <div className="container-fluid">
          <div className="alert alert-danger">You do not have permission to view this page.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-content resource-page-content">
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

        {isLoading ? (
          <ResourceLoader />
        ) : (
          <>
            {/* Metric Header */}
            <div className="row g-3">
              {[
                { label: 'Total Resources', value: (resources.legal_registration?.length || 0) + (resources.education_help?.length || 0) + (resources.download_assets?.length || 0) + (resources.training_academy?.length || 0), icon: 'ri-stack-fill', color: 'primary' },
                { label: 'Education & Help', value: resources.education_help?.length || 0, icon: 'ri-book-open-fill', color: 'primary' },
                { label: 'Training Academy', value: resources.training_academy?.length || 0, icon: 'ri-video-fill', color: 'primary' },
                { label: 'Business Services', value: resources.business_services?.length || 0, icon: 'ri-briefcase-fill', color: 'primary', link: '/business-services' }
              ].map((stat, i) => (
                <div className="col-md-3" key={i}>
                  {stat.link ? (
                    <Link to={stat.link} className="card shadow-sm border-0 rounded-2 card-animate d-block text-decoration-none">
                      <div className="card-body py-3 px-4 d-flex align-items-center">
                        <div className={`avatar-md rounded bg-${bgClass(stat.color)} d-flex align-items-center justify-content-center me-3 shadow-none`}>
                          <i className={`${stat.icon} text-${colorClass(stat.color)} resource-card-icon`}></i>
                        </div>
                        <div>
                          <p className="text-muted mb-0 fs-13 fw-semibold text-uppercase tracking-tight">{stat.label}</p>
                          <h4 className="mb-0 fw-semibold text-dark fs-22 lh-1">{stat.value}</h4>
                        </div>
                      </div>
                    </Link>
                  ) : (
                    <div className="card shadow-sm border-0 rounded-2 bg-white card-animate">
                      <div className="card-body py-3 px-4 d-flex align-items-center">
                        <div className={`avatar-md rounded bg-${bgClass(stat.color)} d-flex align-items-center justify-content-center me-3 shadow-none`}>
                          <i className={`${stat.icon} text-${colorClass(stat.color)} resource-card-icon`}></i>
                        </div>
                        <div>
                          <p className="text-muted mb-0 fs-13 fw-semibold text-uppercase tracking-tight">{stat.label}</p>
                          <h4 className="mb-0 fw-semibold text-dark fs-22 lh-1">{stat.value}</h4>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="row g-3 align-items-stretch mb-4">
              <div className="col-lg-8">
                <div className="row g-3">
                  {/* Category Sections */}
                  <div className="col-md-6">
                    <div className="card shadow-sm border-0 rounded-2 bg-white mb-0">
                      <div className="card-header bg-transparent border-0 pt-4 px-4 d-flex flex-wrap align-items-center justify-content-between gap-2">
                        <h6 className="fw-semibold text-dark mb-0 fs-15">Legal & Registration</h6>
                        {hasPermission('create resources') && (
                          <button className="btn btn-sm btn-soft-primary px-3 py-1.5 fs-11 fw-semibold border-0" onClick={() => handleAddNew('legal_registration')}>
                            <i className="ri-add-line me-1"></i> Add New
                          </button>
                        )}
                      </div>
                      <div className="card-body p-3 pt-0 rh-cat-body position-relative mb-0">
                        <div className={`rh-scroll px-1 ${filteredLegal.length > 4 ? 'rh-scroll-320' : ''} ${user?.is_host == 1 ? 'p-1' : ''}`}>
                          <div className="d-flex flex-column gap-2">
                            {filteredLegal.map((item, i) => (
                              <div className="p-3 rounded-2 border border-light-subtle d-flex align-items-center luxe-item transition-all cursor-pointer" key={item.id} onClick={() => handleItemClick(item)}>
                                <div className="flex-shrink-0 avatar-xs bg-light rounded d-flex align-items-center justify-content-center me-3 luxe-icon">
                                  <i className={`${item.icon || 'ri-article-line'} text-indigo fs-16`}></i>
                                </div>
                                <div className="flex-grow-1 overflow-hidden pe-2 d-flex align-items-center justify-content-between">
                                  <div className="overflow-hidden">
                                    <h6 className="mb-1 fw-semibold fs-14 text-dark text-truncate">{item.title}</h6>
                                    <span className="text-muted fs-11 text-truncate d-block">{item.subtitle}</span>
                                  </div>
                                  {user?.is_host == 1 && (
                                    <div className="ms-2 flex-shrink-0 d-flex align-items-center gap-2">
                                      <AudienceTags item={item} />
                                      <StatusBadge status={item.status} />
                                    </div>
                                  )}
                                </div>
                                <ActionMenu item={item} type="legal_registration" iconClass="ri-more-2-fill" />
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="col-md-6">
                    <div className="card shadow-sm border-0 rounded-2 bg-white mb-0">
                      <div className="card-header bg-transparent border-0 pt-4 px-4 d-flex flex-wrap align-items-center justify-content-between gap-2">
                        <h6 className="fw-semibold text-dark mb-0 fs-15">Business Services</h6>
                        {hasPermission('create resources') && (
                          <button className="btn btn-sm btn-soft-success px-3 py-1.5 fs-11 fw-semibold border-0" onClick={() => handleAddNew('business_services')}>
                            <i className="ri-add-line me-1"></i> Add New
                          </button>
                        )}
                      </div>
                      <div className="card-body p-3 pt-0 rh-cat-body position-relative mb-0">
                        <div className={`rh-scroll px-1 ${filteredBus.length > 4 ? 'rh-scroll-320' : ''} ${user?.is_host == 1 ? 'p-1' : ''}`}>
                          <div className="d-flex flex-column gap-2">
                            {filteredBus.map((item, i) => {
                              const stepData = getFundabilityData(item);
                              return (
                                <div
                                  className="p-3 rounded-2 border border-light-subtle d-flex align-items-center luxe-item transition-all cursor-pointer"
                                  key={item.id || i}
                                  onClick={() => handleFundabilityClick(stepData)}
                                >
                                  <div className="flex-shrink-0 avatar-xs bg-light rounded d-flex align-items-center justify-content-center me-3 luxe-icon">
                                    <i className={`${item.icon || 'ri-service-line'} text-success fs-16`}></i>
                                  </div>
                                  <div className="flex-grow-1 overflow-hidden pe-2 d-flex align-items-center justify-content-between">
                                    <div className="overflow-hidden">
                                      <h6 className="mb-1 fw-semibold fs-14 text-dark text-truncate">{item.title}</h6>
                                      <span className="text-muted fs-11 text-truncate d-block">{item.subtitle || 'Service Category'}</span>
                                    </div>
                                    {user?.is_host == 1 && (
                                      <div className="ms-2 flex-shrink-0 d-flex align-items-center gap-2">
                                        <AudienceTags item={item} />
                                        <StatusBadge status={item.status} />
                                      </div>
                                    )}
                                  </div>
                                  <ActionMenu item={item} type="business_services" iconClass="ri-more-2-fill" />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Education Library */}
                  <div className="col-12">
                    <div className="card shadow-sm border-0 rounded-2 bg-white mb-0">
                      <div className="card-header border-0 bg-navy p-3">
                        <div className="d-flex flex-column flex-lg-row align-items-center justify-content-between gap-3">
                          <div className="flex-grow-1 header-text-group">
                            <h5 className="fw-semibold text-white mb-1 fs-18">Education & Help</h5>
                            <p className="text-white opacity-75 mb-0 fs-13 description-text">
                              Detailed library of borrower education guides, credit building tips, and FAQs.
                            </p>
                          </div>
                          <div className="d-flex align-items-center gap-2 gap-md-2 w-lg-auto mt-3 mt-lg-0 justify-content-end">
                            <div className="search-box-premium position-relative flex-grow-1 flex-lg-grow-0 search-box-premium-container">
                              <i className="ri-search-2-line text-white opacity-50 fs-16 position-absolute top-50 start-0 translate-middle-y ms-3"></i>
                              <input
                                type="text"
                                className="form-control bg-white bg-opacity-10 border-white border-opacity-20 rounded-pill ps-5 py-2 fs-13 text-white shadow-none focus-white-glow transition-all placeholder-white-50 h-40px"
                                placeholder="Search Education & Help..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                              />
                            </div>
                            {hasPermission('create resources') && (
                              <button
                                className="btn btn-soft-success px-3 py-0 fs-12 fw-semibold border-0 rounded-pill text-nowrap d-flex align-items-center justify-content-center shadow-sm h-40px"
                                onClick={() => handleAddNew('education_help')}
                              >
                                <i className="ri-add-line me-1 fs-14"></i> Add New
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="card-body p-3 rh-cat-body position-relative">
                        <div className={`rh-scroll px-1 ${filteredEdu.length > 12 ? 'rh-scroll-460' : ''} ${user?.is_host == 1 ? 'p-2' : ''}`}>
                          <div className="row g-3 mb-2">
                            {filteredEdu.map((edu, i) => (
                              <div className="col-6 col-md-4 col-xl-3" key={edu.id || i}>
                                <div className="p-3 rounded-3 text-center edu-box-premium transition-all cursor-pointer h-100 border border-light-subtle position-relative bg-white shadow-sm" onClick={() => handleItemClick(edu.original)}>
                                  {user?.is_host == 1 && (
                                    <div className="position-absolute top-0 start-0 p-2 d-flex align-items-center gap-1">
                                      <StatusBadge status={edu.original.status} />
                                      <AudienceTags item={edu.original} />
                                    </div>
                                  )}
                                  <div className="position-absolute top-0 end-0 p-2">
                                    <ActionMenu item={edu.original || edu} type="education_help" />
                                  </div>
                                  <div className={`avatar-sm bg-${edu.color}-subtle rounded-3 d-flex align-items-center justify-content-center mx-auto mb-3 mt-1`}>
                                    <i className={`${edu.icon} text-${edu.color} fs-20`}></i>
                                  </div>
                                  <h6 className="mb-1 fw-semibold fs-14 text-dark text-truncate px-2">{edu.title}</h6>
                                  <p className="text-muted fs-11 mb-0 fw-medium opacity-75 text-truncate px-2">{edu.sub}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-lg-4 d-flex flex-column">
                <div className="d-flex flex-column gap-3 h-100">
                  {/* Asset Sidebar */}
                  <div className="card shadow-sm rounded-2 bg-white mb-0">
                    <div className="card-header border-bottom border-light p-3 d-flex flex-wrap align-items-center justify-content-between gap-2">
                      <h6 className="fw-semibold text-dark mb-0 fs-14 text-uppercase tracking-wider">Download Assets</h6>
                      {hasPermission('create resources') && (
                        <button className="btn btn-sm btn-soft-danger px-3 py-1.5 fs-11 fw-semibold border-0" onClick={() => handleAddNew('download_assets')}>
                          <i className="ri-add-line me-1"></i> Add New
                        </button>
                      )}
                    </div>
                    <div className="card-body p-3 pt-0 rh-cat-body position-relative mb-0">
                      <div className="rh-scroll scrollable-container-assets px-0">
                        <div className="list-group list-group-flush">
                          {documentItems.map((doc, i) => (
                            <div className="list-group-item border-bottom border-light list-group-item-action border-0 p-3 transition-all d-flex align-items-center justify-content-between cursor-pointer" key={doc.id} onClick={() => handleItemClick(doc.original)}>
                              <div className="d-flex align-items-center flex-grow-1 pe-2">
                                <i className={`${doc.icon} text-${doc.color} fs-20 me-3`}></i>
                                <div className="flex-grow-1 overflow-hidden d-flex align-items-center justify-content-between">
                                  <h6 className="mb-0 fs-13 fw-semibold text-dark text-truncate">{doc.title}</h6>
                                  {user?.is_host == 1 && (
                                    <div className="ms-2 d-flex align-items-center gap-2">
                                      <AudienceTags item={doc.original} />
                                      <StatusBadge status={doc.original.status} />
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="d-flex align-items-center gap-2">
                                {doc.original.file_url && (
                                  <i
                                    className="ri-download-2-line text-muted fs-18 cursor-pointer hover-primary p-2"
                                    onClick={(e) => { e.stopPropagation(); handleItemClick(doc.original, true); }}
                                    title="Download"
                                  ></i>
                                )}
                                <ActionMenu item={doc.original} type="download_assets" />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Training Academy */}
                  <div className="card shadow-sm rounded-2 bg-white mb-0 flex-grow-1 d-flex flex-column">
                    <div className="card-header border-bottom border-light p-3 d-flex align-items-center justify-content-between gap-2">
                      <h6 className="fw-semibold text-dark mb-0 fs-15 text-nowrap"><i className="ri-youtube-fill text-danger me-2"></i> Training Academy</h6>
                      <div className="d-flex align-items-center gap-2">
                        {hasPermission('create resources') && (
                          <button className="btn btn-sm btn-soft-danger px-3 py-1.5 fs-11 fw-semibold border-0 text-nowrap" onClick={() => handleAddNew('training_academy')}>
                            <i className="ri-add-line me-1"></i> Add New
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="card-body p-3 pt-0 flex-grow-1 d-flex flex-column">
                      <div className="rh-scroll scrollable-container-training p-0" style={{ overflowY: 'auto', overflowX: 'hidden' }}>
                        <div className="d-flex flex-column gap-1 p-0 mt-3">
                          {trainingVideos.map((video, i) => (
                            <div className="rh-video-item d-flex align-items-center gap-3" key={video.id} onClick={() => handleItemClick(video.original)}>
                              <div className="rh-video-thumb">
                                <img
                                  src={video.thumbnail}
                                  alt={video.title}
                                />
                                <div className="rh-video-overlay"></div>
                                <i className="ri-play-circle-fill rh-video-play"></i>
                              </div>
                              <div className="flex-grow-1 overflow-hidden pe-1">
                                <div className="d-flex justify-content-between align-items-start ">
                                  <h6 className="mb-0 fs-13 fw-semibold text-dark text-truncate rh-video-title">
                                    {video.title}
                                  </h6>
                                  <ActionMenu item={video.original} type="training_academy" />
                                </div>
                                {video.subtitle && (
                                  <p className="text-muted fs-11 mb-1 text-truncate opacity-75">
                                    {video.subtitle}
                                  </p>
                                )}
                                <div className="d-flex align-items-center gap-2 opacity-75">
                                  {user?.is_host == 1 && (
                                    <div className="d-flex align-items-center gap-1">
                                      <AudienceTags item={video.original} />
                                      <StatusBadge status={video.original.status} />
                                    </div>
                                  )}
                                  <span className="fs-10 text-muted opacity-75">• {video.createdAt}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        <DeleteConfirmationModal
          show={showDeleteModal}
          onConfirm={confirmDelete}
          onClose={() => setShowDeleteModal(false)}
          loading={deleteMutation.isPending}
          text="Are you sure you want to delete this resource?"
        />

        {/* PDF Viewer Modal */}
        <Modal isOpen={showPdfModal} size="xl" centered className="modal-dialog-centered pdf-modal-size">
          <ModalHeader className="bg-white border-bottom py-3 px-4 w-100" cssModule={{ 'modal-title': 'w-100 m-0' }}>
            <div className="d-flex align-items-center justify-content-between w-100">
              <div className="d-flex align-items-center">
                <div className="avatar-sm bg-primary-subtle rounded me-3 d-flex align-items-center justify-content-center">
                  <i className="ri-file-pdf-fill text-primary fs-22"></i>
                </div>
                <div>
                  <h5 className="mb-0 fs-16 fw-bold text-dark">{activePreviewResource?.title}</h5>
                  <p className="text-muted fs-12 mb-0 mt-1">Resource Hub Preview</p>
                </div>
              </div>
              <div className="d-flex align-items-center gap-3">
                {activePreviewResource?.file_url && (
                  <button
                    className="btn btn-primary px-4 py-2 d-flex align-items-center gap-2 shadow-sm h-40px fs-14 fw-medium"
                    onClick={() => activePreviewResource && handleItemClick(activePreviewResource, true)}
                  >
                    <i className="ri-download-2-line fs-16"></i> Download
                  </button>
                )}
                <button type="button" className="btn-close ms-2" onClick={() => setShowPdfModal(false)} aria-label="Close"></button>
              </div>
            </div>
          </ModalHeader>
          <ModalBody className="p-0 bg-light pdf-modal-body">
            {(activePreviewResource?.file_url || activePreviewResource?.link) ? (
              <div className="h-100 w-100 position-relative">
                <iframe
                  src={activePreviewResource.file_url ? `${activePreviewResource.file_url}#toolbar=0&navpanes=0&scrollbar=1` : getEmbedUrl(activePreviewResource.link || '')}
                  title={activePreviewResource?.title}
                  className="border-0 shadow-sm bg-white pdf-iframe"
                  allowFullScreen
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                />
              </div>
            ) : (
              <div className="d-flex align-items-center justify-content-center h-100">
                <div className="text-center">
                  <div className="spinner-border text-primary mb-3" role="status"></div>
                  <p className="text-muted">Loading preview...</p>
                </div>
              </div>
            )}
          </ModalBody>
        </Modal>

        {/* Fundability System Modal */}
        <Modal isOpen={showFundabilityModal} toggle={() => setShowFundabilityModal(false)} size="lg" centered className="fundability-modal">
          {activeFundabilityStep && (
            <>
              <ModalHeader className="bg-white border-bottom py-3 px-4" toggle={() => setShowFundabilityModal(false)}>
                <div className="d-flex align-items-center">
                  <div className={`avatar-sm bg-${activeFundabilityStep.color}-subtle rounded-3 me-3 d-flex align-items-center justify-content-center`}>
                    <i className={`${activeFundabilityStep.icon} text-${activeFundabilityStep.color} fs-24`}></i>
                  </div>
                  <div>
                    <h5 className="mb-0 fs-18 fw-semibold text-dark">{activeFundabilityStep.title}</h5>
                  </div>
                </div>
              </ModalHeader>
              <ModalBody className="p-4 bg-light bg-opacity-50">
                <div className="row g-4 mb-4">
                  <div className="col-lg-7">
                    <div className="mb-4 mb-lg-0">
                      <h5 className="fw-semibold text-dark mb-3 d-flex align-items-center">
                        <i className="ri-article-line text-primary me-2 fs-18"></i> Overview
                      </h5>
                      <ul className="list-unstyled mb-0">
                        {activeFundabilityStep.overview.map((text: string, i: number) => (
                          <li key={i} className="d-flex align-items-start mb-2 fs-14 text-muted">
                            <i className="ri-checkbox-circle-fill text-success me-2 mt-1"></i>
                            {text}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="col-lg-5">
                    <div className="p-3 bg-primary-subtle bg-opacity-30 rounded-3 border border-primary border-opacity-10 h-100">
                      <h5 className="fw-semibold text-primary mb-2 d-flex align-items-center">
                        <i className="ri-flashlight-line me-2"></i> Why It Matters
                      </h5>
                      <ul className="list-unstyled mb-0">
                        {activeFundabilityStep.impact.map((text: string, i: number) => (
                          <li key={i} className="d-flex align-items-start mb-2 fs-13 text-dark opacity-75">
                            <i className="ri-arrow-right-s-line text-primary me-1"></i>
                            {text}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                <hr className="my-2 border-light" />

                {activeFundabilityStep.providers.length > 0 ? (
                  <div className="recommended-providers-section">
                    <h5 className="fw-semibold text-dark mb-4 d-flex align-items-center">
                      <i className="ri-shield-check-fill text-success me-2 fs-18"></i> Recommended Providers
                    </h5>
                    <div className="rh-scroll rh-scroll-modal-list">
                      <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-3 mx-n2 pb-2">
                        {activeFundabilityStep.providers.map((provider: any, i: number) => (
                          <div className="col px-2" key={i}>
                            <div className="p-3 bg-white rounded-3 shadow-sm h-100 d-flex flex-column transition-all hover-shadow" style={{ border: '1px solid rgba(0, 0, 0, 0.06)' }}>
                              <div className="d-flex justify-content-between align-items-start mb-2">
                                <h6 className="mb-0 fw-semibold fs-15 text-dark">{provider.name}</h6>
                                {provider.is_recommended && (
                                  <span className="badge bg-warning-subtle text-warning border-warning-subtle rounded-pill px-2 py-1 fs-10">
                                    <i className="ri-star-fill align-middle"></i>
                                  </span>
                                )}
                              </div>
                              <p className="text-muted fs-13 mb-3 lh-base flex-grow-1">{provider.desc}</p>
                              <a
                                href={provider.link}
                                target="_blank"
                                rel="noreferrer"
                                className="btn btn-primary btn-sm w-100 py-2 rounded-2 shadow-sm d-flex align-items-center justify-content-center gap-2 transition-all mt-auto"
                              >
                                {provider.btn_label || 'Get Started'}
                                <i className="ri-external-link-line fs-14"></i>
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 text-center bg-white rounded-3 border border-light-subtle border-dashed">
                    <i className="ri-search-eye-line fs-40 text-muted mb-2"></i>
                    <h6 className="fw-semibold text-dark mb-1">More Resources Needed?</h6>
                    <p className="text-muted fs-12 mb-0">Check the main library for additional tools and partners.</p>
                  </div>
                )}
              </ModalBody>
              <ModalFooter className="bg-white border-top py-3 px-4">
                <button className="btn btn-light fw-semibold px-4" onClick={() => setShowFundabilityModal(false)}>Close</button>
              </ModalFooter>
            </>
          )}
        </Modal>

      </div>
    </div>
  );
};

export default Resource;
