import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const Resource: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAllVideos, setShowAllVideos] = useState(false);

  const educationItems = [
    { title: "Getting Started", sub: "Events Community", icon: "ri-lightbulb-flash-line", color: "warning" },
    { title: "Fundability Standards", sub: "Business Credit Tenstars", icon: "ri-government-line", color: "primary" },
    { title: "Tier System Explained", sub: "Business Support and Analysis", icon: "ri-honour-line", color: "indigo" },
    { title: "Tier System Explained", sub: "Business Resort Guide", icon: "ri-building-line", color: "info" },
    { title: "Documents & Compliance", sub: "Digital Asset Documentation", icon: "ri-folder-shield-2-line", color: "primary" },
    { title: "Funding Readiness", sub: "Business Credit Facilities", icon: "ri-bank-line", color: "indigo" },
    { title: "Banking & Cash Management", sub: "Financial Control Systems", icon: "ri-wallet-3-line", color: "info" },
    { title: "Common Denial Reasons", sub: "Glossary & Forensics", icon: "ri-delete-bin-7-line", color: "danger" },
    { title: "FAQs", sub: "Handle 1a Animation Graphics", icon: "ri-question-answer-line", color: "primary" },
    { title: "Glossary", sub: "Funding & Credit Terms", icon: "ri-book-open-line", color: "indigo" },
    { title: "Tier 0 Checklist", sub: "Compliance Prerequisites", icon: "ri-list-settings-line", color: "success" },
    { title: "Glossary", sub: "Tier Prep Talk Freebies", icon: "ri-book-2-line", color: "indigo" }
  ];

  const filteredEdu = educationItems.filter(item =>
    item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.sub.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const documentItems = [
    { title: "Business Formation Checklist", type: "PDF", color: "danger", icon: "ri-file-list-3-line" },
    { title: "Credit Application Template", type: "DOCX", color: "indigo", icon: "ri-file-user-line" },
    { title: "Vendor Worksheets", type: "XLSX", color: "success", icon: "ri-file-chart-line" }
  ];

  const trainingVideos = [
    { title: "Mastering Business Fundability", duration: "12:45", views: "1.2k", color: "#4b38b3" },
    { title: "Compliance Quickstart Guide", duration: "08:20", views: "850", color: "#0ab39c" },
    { title: "Building Tier 1 Credit Fast", duration: "15:10", views: "2.5k", color: "#f06548" },
    { title: "Advanced Cashflow Strategies", duration: "10:30", views: "1.1k", color: "#f7b84b" },
    { title: "Entity Structuring for Growth", duration: "11:15", views: "900", color: "#299cdb" },
    { title: "Scaling Business to Tier 4", duration: "18:45", views: "3.2k", color: "#673ab7" },
    { title: "Understanding Credit Reports", duration: "09:30", views: "1.5k", color: "#4b38b3" },
    { title: "Navigating Funding Rounds", duration: "14:20", views: "720", color: "#0ab39c" },
    { title: "Tax Strategies for Small Biz", duration: "12:00", views: "1.8k", color: "#f06548" },
    { title: "Business Insurance Basics", duration: "07:45", views: "640", color: "#f7b84b" },
    { title: "Effective Pitch Decks", duration: "16:10", views: "2.1k", color: "#299cdb" },
    { title: "Managing Remote Teams", duration: "13:40", views: "950", color: "#673ab7" }
  ];

  const visibleVideos = showAllVideos ? trainingVideos : trainingVideos.slice(0, 6);

  const filteredDocs = documentItems.filter(doc =>
    doc.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
            { label: 'Total Resources', value: '12', icon: 'ri-grid-fill', color: 'primary' },
            { label: 'Service Providers', value: '4', icon: 'ri-briefcase-fill', color: 'primary' },
            { label: 'Categories Covered', value: '6', icon: 'ri-stack-fill', color: 'warning' },
            { label: 'Quick Tools', value: '5', icon: 'ri-rocket-2-fill', color: 'primary' }
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
                  <div className="card-header bg-transparent border-0 pt-4 px-4">
                    <h6 className="fw-bold text-dark mb-0 fs-15">Legal & Registration</h6>
                  </div>
                  <div className="card-body p-4 pt-2">
                    <div className="d-flex flex-column gap-3">
                      {[
                        { title: "EIN Overview", sub: "Federal Identification Overview", icon: "ri-article-line" },
                        { title: "Entity Registration", sub: "Overview & Compliance Overview", icon: "ri-file-copy-2-line" },
                        { title: "SOS Compliance Overview", sub: "Overviews State Coverage Business", icon: "ri-file-shield-2-line" },
                        { title: "Licensing & Compliance Note", sub: "Operational Guidance Overview", icon: "ri-file-check-line" }
                      ].map((item, i) => (
                        <div className="p-3 rounded-2 border border-light-subtle d-flex align-items-center luxe-item transition-all" key={i}>
                          <div className="flex-shrink-0 avatar-xs bg-light rounded d-flex align-items-center justify-content-center me-3 luxe-icon">
                            <i className={`${item.icon} text-indigo fs-16`}></i>
                          </div>
                          <div className="flex-grow-1">
                            <h6 className="mb-1 fw-bold fs-14 text-dark">{item.title}</h6>
                            <span className="text-muted fs-11">{item.sub}</span>
                          </div>
                          <i className="ri-arrow-right-s-line text-muted"></i>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-md-6">
                <div className="card shadow-sm border-0 rounded-2 h-100 bg-white">
                  <div className="card-header bg-transparent border-0 pt-4 px-4">
                    <h6 className="fw-bold text-dark mb-0 fs-15">Business Services</h6>
                  </div>
                  <div className="card-body p-4 pt-2">
                    <div className="d-flex flex-column gap-3">
                      {[
                        { title: "Professional Business Address/", sub: "Business Presence Essentials", icon: "ri-phone-circle-line" },
                        { title: "411 / Directory Listing Basics", sub: "Business Telcom Solutions", icon: "ri-list-check" },
                        { title: "Business Phone Setup Basics", sub: "ri-terminal-window-line", icon: "ri-terminal-window-line" },
                        { title: "Communications & Presence Standards", sub: "Business Telecom-Specific Solutions", icon: "ri-chat-1-line" }
                      ].map((item, i) => (
                        <div className="p-3 rounded-2 border border-light-subtle d-flex align-items-center luxe-item-success transition-all" key={i}>
                          <div className="flex-shrink-0 avatar-xs bg-light rounded d-flex align-items-center justify-content-center me-3 luxe-icon">
                            <i className={`${item.icon} text-success fs-16`}></i>
                          </div>
                          <div className="flex-grow-1">
                            <h6 className="mb-1 fw-bold fs-14 text-dark">{item.title}</h6>
                            <span className="text-muted fs-11">{item.sub}</span>
                          </div>
                          <i className="ri-arrow-right-s-line text-muted"></i>
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
                    <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
                      <div>
                        <h5 className="fw-bold text-white mb-1">Education & Help</h5>
                        <p className="text-white opacity-50 mb-0 fs-13">Detailed library of borrower education guides, credit building tips, and FAQs.</p>
                      </div>
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
                  <div className="card-body p-4">
                    <div className="row g-3">
                      {filteredEdu.map((edu, i) => (
                        <div className="col-6 col-md-4 col-xl-3" key={i}>
                          <div className="p-3 rounded-2 text-center edu-box-premium transition-all cursor-pointer h-100 border border-light-subtle">
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
                <div className="card-header border-bottom border-light p-3">
                  <h6 className="fw-bold text-dark mb-0 fs-14 text-uppercase tracking-wider">Download Assets</h6>
                </div>
                <div className="card-body p-0">
                  <div className="list-group list-group-flush">
                    {filteredDocs.map((doc, i) => (
                      <div className="list-group-item list-group-item-action border-0 p-3 transition-all d-flex align-items-center justify-content-between cursor-pointer" key={i}>
                        <div className="d-flex align-items-center">
                          <i className={`${doc.icon} text-${doc.color} fs-20 me-3`}></i>
                          <h6 className="mb-0 fs-13 fw-semibold text-dark">{doc.title}</h6>
                        </div>
                        <i className="ri-download-2-line text-muted fs-14"></i>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Training Academy */}
              <div className="card shadow-sm border-0 rounded-2 bg-white animate-fade-in-right">
                <div className="card-header border-bottom border-light p-4 d-flex align-items-center justify-content-between">
                  <h6 className="fw-bold text-dark mb-0 fs-15"><i className="ri-youtube-fill text-danger me-2"></i> Training Academy</h6>
                  <span className="badge bg-danger-subtle text-danger fs-10">{trainingVideos.length} Videos</span>
                </div>
                <div className="card-body p-4 pt-3">
                  <div className="d-flex flex-column gap-4">
                    {visibleVideos.map((video, i) => (
                      <div className="video-item d-flex align-items-center gap-3 cursor-pointer group" key={i}>
                        <div className="video-thumb position-relative rounded-2 flex-shrink-0 overflow-hidden shadow-sm" style={{ width: '110px', height: '64px' }}>
                          <img
                            src={`https://placehold.co/220x128/${video.color.replace('#', '')}/white?text=Tutorial+${i + 1}`}
                            alt={video.title}
                            className="w-100 h-100 object-cover"
                          />
                          <div className="bg-overlay-dark position-absolute top-0 start-0 w-100 h-100 bg-dark opacity-25"></div>
                          <i className="ri-play-circle-fill text-white fs-28 position-absolute top-50 start-50 translate-middle z-1 mb-0 transition-all play-icon"></i>
                          <span className="position-absolute bottom-0 end-0 bg-dark bg-opacity-75 text-white fs-9 px-1 rounded-1 m-1 fw-semibold">{video.duration}</span>
                        </div>
                        <div className="flex-grow-1 overflow-hidden">
                          <h6 className="mb-1 fs-13 fw-bold text-dark lh-base transition-all video-title multi-line-truncate">{video.title}</h6>
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
