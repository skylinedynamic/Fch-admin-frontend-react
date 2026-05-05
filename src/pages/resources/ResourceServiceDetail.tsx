import React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useResource } from '../../modules/resource/queries';
import ResourceDetailLoader from '../../components/Loader/ResourceDetailLoader';
import { Container, Row, Col, Card, CardHeader, CardBody, Button } from 'reactstrap';
import ErrorPage from '../Utility/ErrorPage';
import '../../../assets/css/resource-detail.css';

const ResourceServiceDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { data: resourceResponse, isLoading, error } = useResource(id);
    const resource = resourceResponse?.data;

    if (isLoading) return <ResourceDetailLoader />;

    if (error || !resource) {
        return (
            <ErrorPage
                status={404}
                title="Resource Not Found"
                message="The business service or resource you are trying to access could not be found."
            />
        );
    }

    return (
        <div className="page-content resource-detail-container">
            <Container fluid>
                {/* Page Header & Breadcrumbs */}
                <div className="row">
                    <div className="col-12">
                        <div className="d-flex align-items-center justify-content-between flex-row py-2">
                            <div className="flex-grow-1">
                                <h4 className="fs-20 mb-1">{resource.title}</h4>
                                <nav aria-label="breadcrumb" className="d-none d-sm-block">
                                    <ol className="breadcrumb m-0">
                                        <li className="breadcrumb-item"><Link to="/">Dashboard</Link></li>
                                        <li className="breadcrumb-item"><Link to="/resources">Resources</Link></li>
                                        <li className="breadcrumb-item active" aria-current="page">{resource.title}</li>
                                    </ol>
                                </nav>
                            </div>
                            <div className="mt-0">
                                <Link to="/resources" className="btn btn-primary fw-medium">
                                    <i className="ri-arrow-left-line me-1 align-bottom"></i> Back
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Refined Symmetrical Briefing */}
                <Card className="border-0 shadow-sm mb-4 rounded-0">
                    <CardBody className="p-4 p-md-4">
                        <Row className="g-0">
                            {/* Service Overview */}
                            <Col lg={6} className="pe-lg-5">
                                <div className="d-flex align-items-center gap-3 mb-4">
                                    <div className="avatar-sm bg-primary-subtle text-primary rounded-circle d-flex align-items-center justify-content-center shadow-sm">
                                        <i className="ri-layout-grid-line fs-18"></i>
                                    </div>
                                    <div>
                                        <h5 className="fw-bold mb-0 text-dark">Service Overview</h5>
                                        <small className="text-muted d-block uppercase tracking-wider fs-10 fw-medium">Main Guidance</small>
                                    </div>
                                </div>
                                {resource.overview_text && (
                                    <p className="text-muted fs-14 lh-lg mb-4">{resource.overview_text}</p>
                                )}
                                <div className="vstack gap-1">
                                    {resource.overview && resource.overview.length > 0 ? (
                                        resource.overview.map((text, i) => (
                                            <div key={i} className="d-flex align-items-start gap-3 py-1 border-bottom border-light">
                                                <span className="badge bg-primary-subtle text-primary fw-bold fs-11 flex-shrink-0">{i + 1}</span>
                                                <span className="text-dark fs-14">{text}</span>
                                            </div>
                                        ))
                                    ) : (
                                        !resource.overview_text && <span className="text-muted fs-13 italic p-3 bg-light rounded w-100">Guidance details coming soon.</span>
                                    )}
                                </div>
                            </Col>

                            {/* Divider for Desktop */}
                            <div className="d-none d-lg-block border-start border-light position-absolute start-50 top-50 translate-middle-x" style={{ height: '70%', opacity: 0.5 }}></div>

                            {/* Why it matters */}
                            <Col lg={6} className="ps-lg-5 mt-5 mt-lg-0">
                                <div className="d-flex align-items-center gap-3 mb-4">
                                    <div className="avatar-sm bg-info-subtle text-info rounded-circle d-flex align-items-center justify-content-center shadow-sm">
                                        <i className="ri-rocket-line fs-18"></i>
                                    </div>
                                    <div>
                                        <h5 className="fw-bold mb-0 text-dark">Why it matters</h5>
                                        <small className="text-muted d-block uppercase tracking-wider fs-10 fw-medium">Strategic Value</small>
                                    </div>
                                </div>
                                {resource.impact_text && (
                                    <p className="text-muted fs-14 lh-lg mb-4">{resource.impact_text}</p>
                                )}
                                <div className="vstack gap-1">
                                    {resource.impact && resource.impact.length > 0 ? (
                                        resource.impact.map((text, i) => (
                                            <div key={i} className="d-flex align-items-start gap-3 py-1 border-bottom border-light">
                                                <span className="badge bg-info-subtle text-info fw-bold fs-11 flex-shrink-0">{i + 1}</span>
                                                <span className="text-dark fs-14">{text}</span>
                                            </div>
                                        ))
                                    ) : (
                                        !resource.impact_text && <span className="text-muted fs-13 italic p-3 bg-light rounded w-100">Impact details coming soon.</span>
                                    )}
                                </div>
                            </Col>
                        </Row>
                    </CardBody>
                </Card>

                {/* Recommended Providers Section */}
                {/* Main Providers Container Card */}
                <Card className="border-0 shadow-sm mb-4 rounded-0">
                    <CardHeader className="p-4 border-bottom border-light border-bottom-dashed">
                        <div className="d-flex align-items-center gap-2">
                            <i className="ri-verified-badge-fill text-success fs-18"></i>
                            <h5 className="mb-0 fw-bold">Verified Partners & Providers</h5>
                        </div>
                    </CardHeader>
                    <CardBody className="p-3 p-md-4 bg-light bg-opacity-30">
                        {resource.providers && resource.providers.length > 0 ? (
                            <div className="provider-grid">
                                {resource.providers.map((provider, i) => (
                                    <Card className={`provider-card border-0 shadow-sm rounded-0 overflow-hidden position-relative ${provider.is_recommended ? 'recommended-provider' : ''}`} key={i}>
                                        {provider.is_recommended && (
                                            <div className="provider-recommended-ribbon">
                                                <i className="ri-star-fill"></i>
                                            </div>
                                        )}
                                        <CardBody className="p-3">
                                            <div className="d-flex flex-column align-items-center gap-3 mb-3 mt-2 text-center">
                                                <div className="provider-logo-box bg-white shadow-sm rounded-0 text-start">
                                                    {provider.logo ? (
                                                        <img src={provider.logo} alt={provider.name} />
                                                    ) : (
                                                        <div className="avatar-xs d-flex align-items-center justify-content-center bg-light rounded-0">
                                                            <i className="ri-building-line text-muted"></i>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="w-100 text-start">
                                                    <h5 className="provider-title mb-0 fw-bold fs-14">{provider.name}</h5>
                                                </div>
                                            </div>

                                            <p className="provider-desc text-muted fs-13 mb-3">
                                                {provider.desc}
                                            </p>

                                            {provider.desc_list && provider.desc_list.length > 0 && (
                                                <ul className="features-bullet-list border-top border-light list-unstyled">
                                                    {provider.desc_list.map((item, idx) => (
                                                        <li key={idx} className="d-flex align-items-start gap-2 mb-2 fs-12 text-dark">
                                                            {item}
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </CardBody>

                                        <div className="card-footer bg-light bg-opacity-50 border-top-0 p-3">
                                            <a
                                                href={provider.link}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="btn btn-primary w-100 rounded-0"
                                            >
                                                {provider.btn_label ?? 'Get Started'} <i className="ri-arrow-right-line ms-1"></i>
                                            </a>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        ) : (
                            <div className="py-5 my-2 text-center mx-3">
                                <div className="avatar-lg bg-primary-subtle text-primary rounded-circle mx-auto mb-4 d-flex align-items-center justify-content-center shadow-sm" style={{ width: '80px', height: '80px' }}>
                                    <i className="ri-team-line fs-48"></i>
                                </div>
                                <h5 className="fw-bold fs-18 text-dark mb-2">Network Expansion in Progress</h5>
                                <p className="text-muted mx-auto mb-0 px-4 lh-lg" style={{ maxWidth: '500px' }}>
                                    We are currently vetting and onboarding top-tier providers specialized in
                                    <span className="text-primary fw-semibold ms-1">{resource?.title}</span>
                                    to ensure you get the highest quality support.
                                </p>
                                <div className="mt-4">
                                    <span className="badge rounded-pill bg-info-subtle text-info fs-11 px-3 py-2">
                                        <i className="ri-notification-badge-line me-1 align-middle"></i> NEW RECOMMENDATIONS COMING SOON
                                    </span>
                                </div>
                            </div>
                        )}
                    </CardBody>
                </Card>
            </Container>
        </div>
    );
};

export default ResourceServiceDetail;
