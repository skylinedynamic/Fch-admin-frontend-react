import React, { useEffect, useState } from 'react';
import { Modal, ModalHeader, ModalBody, Row, Col, Card, CardBody } from 'reactstrap';
import { Skeleton } from 'primereact/skeleton';
import { fetchClientById } from '../../../modules/client/services';
import type { Client } from '../../../modules/client/types';
import { toast } from 'react-toastify';

interface ClientDetailsModalProps {
    isOpen: boolean;
    toggle: () => void;
    clientId: number | string | null;
}

const ClientDetailsModal: React.FC<ClientDetailsModalProps> = ({ isOpen, toggle, clientId }) => {
    const [client, setClient] = useState<Client | null>(null);
    const [loading, setLoading] = useState<boolean>(false);

    useEffect(() => {
        if (isOpen && clientId) {
            loadClientDetails();
        } else {
            setClient(null);
        }
    }, [isOpen, clientId]);

    const loadClientDetails = async () => {
        setLoading(true);
        try {
            const data = await fetchClientById(clientId!);
            // Handle wrapper response if data is nested inside data, but based on sample it looks like { status, message, data }
            // Let's assume the fetchClientById un-nests or returns the correct wrapper based on how the hook is used.
            // Oh wait, fetchClientById in services returns `data` object straight from `const { data } = await apiClient.get(...)`
            // If the backend drops `{ status, data: { ...borrower } }`, then we extract `data.data` or just `data`.
            // Looking at the sample JSON, the structure is { status: true, data: { ... } }
            // Let's support both nested and direct.
            const clientData = (data as any)?.data || data;
            setClient(clientData as Client);
        } catch (error: any) {
            toast.error(error?.response?.data?.message || error.message || 'Failed to fetch client details');
        } finally {
            setLoading(false);
        }
    };

    const InfoItem = ({ label, value }: { label: string, value: any }) => (
        <div className="mb-3">
            <span className="fw-semibold text-muted d-block mb-1">{label}</span>
            <span className="fs-14">{value || 'N/A'}</span>
        </div>
    );

    const SkeletonInfoItem = () => (
        <div className="mb-3">
            <Skeleton width="40%" height="1rem" className="mb-2" />
            <Skeleton width="80%" height="1.2rem" />
        </div>
    );

    return (
        <Modal
            isOpen={isOpen}
            toggle={toggle}
            size="xl"
            centered
            scrollable
            fade={true}
        >
            <ModalHeader toggle={toggle} className="border-bottom pb-3">
                <h5 className="modal-title">Client Details</h5>
            </ModalHeader>
            <ModalBody className="p-4 bg-light">
                {loading ? (
                    <Row className="g-4">
                        <Col lg={4}>
                            <Card className="h-100 mb-0 shadow-sm border-0">
                                <CardBody>
                                    <Skeleton width="60%" height="1.5rem" className="mb-4 pb-2 border-bottom" />
                                    <div className="text-center mb-4">
                                        <Skeleton shape="circle" size="6rem" className="mx-auto mb-3" />
                                        <Skeleton width="80%" height="1.5rem" className="mx-auto mb-1" />
                                        <Skeleton width="60%" height="1rem" className="mx-auto" />
                                    </div>
                                    <SkeletonInfoItem />
                                    <SkeletonInfoItem />
                                    <SkeletonInfoItem />
                                    <SkeletonInfoItem />
                                </CardBody>
                            </Card>
                        </Col>
                        <Col lg={8}>
                            <Card className="mb-4 shadow-sm border-0">
                                <CardBody>
                                    <Skeleton width="40%" height="1.5rem" className="mb-4 pb-2 border-bottom" />
                                    <Row>
                                        <Col md={6}><SkeletonInfoItem /></Col>
                                        <Col md={6}><SkeletonInfoItem /></Col>
                                        <Col md={6}><SkeletonInfoItem /></Col>
                                        <Col md={6}><SkeletonInfoItem /></Col>
                                        <Col md={6}><SkeletonInfoItem /></Col>
                                        <Col md={6}><SkeletonInfoItem /></Col>
                                        <Col md={12}><SkeletonInfoItem /></Col>
                                    </Row>
                                </CardBody>
                            </Card>
                            <Row className="g-4">
                                <Col md={6}>
                                    <Card className="h-100 shadow-sm border-0">
                                        <CardBody>
                                            <Skeleton width="70%" height="1.5rem" className="mb-4 pb-2 border-bottom" />
                                            <Row>
                                                <Col sm={6}><SkeletonInfoItem /></Col>
                                                <Col sm={6}><SkeletonInfoItem /></Col>
                                                <Col sm={6}><SkeletonInfoItem /></Col>
                                                <Col sm={6}><SkeletonInfoItem /></Col>
                                                <Col sm={6}><SkeletonInfoItem /></Col>
                                                <Col sm={6}><SkeletonInfoItem /></Col>
                                            </Row>
                                        </CardBody>
                                    </Card>
                                </Col>
                                <Col md={6}>
                                    <Card className="h-100 shadow-sm border-0">
                                        <CardBody>
                                            <Skeleton width="50%" height="1.5rem" className="mb-4 pb-2 border-bottom" />
                                            <Row>
                                                <Col sm={6}><SkeletonInfoItem /></Col>
                                                <Col sm={6}><SkeletonInfoItem /></Col>
                                                <Col sm={6}><SkeletonInfoItem /></Col>
                                                <Col sm={6}><SkeletonInfoItem /></Col>
                                                <Col sm={12}><SkeletonInfoItem /></Col>
                                            </Row>
                                        </CardBody>
                                    </Card>
                                </Col>
                            </Row>
                        </Col>
                    </Row>
                ) : client ? (
                    <Row className="g-4">
                        <Col lg={4}>
                            <Card className="h-100 mb-0 shadow-sm border-0">
                                <CardBody>
                                    <h6 className="card-title mb-4 pb-2 border-bottom text-primary"><i className="ri-user-line me-2"></i>Personal Information</h6>
                                    <div className="text-center mb-4">
                                        <div className="avatar-xl mx-auto mb-3">
                                            <div className="avatar-title bg-primary-subtle text-primary rounded-circle fs-24 shadow-sm">
                                                {client.first_name?.charAt(0)}{client.last_name?.charAt(0)}
                                            </div>
                                        </div>
                                        <h5 className="mb-1">{client.full_name || `${client.first_name} ${client.last_name}`}</h5>
                                        <p className="text-muted mb-0">{client.email}</p>
                                    </div>
                                    <InfoItem label="Phone Number" value={client.phone_number} />
                                    <InfoItem label="Date of Birth" value={client.date_of_birth} />
                                    <InfoItem label="Last 4 SSN" value={client.last_4_ssn} />
                                    <InfoItem label="Address" value={client.home_address} />

                                </CardBody>
                            </Card>
                        </Col>
                        <Col lg={8}>
                            <Card className="mb-4 shadow-sm border-0">
                                <CardBody>
                                    <h6 className="card-title mb-4 pb-2 border-bottom text-primary"><i className="ri-building-line me-2"></i>Business Details</h6>
                                    <Row>
                                        <Col md={6}><InfoItem label="Business Name" value={client.business_name} /></Col>
                                        <Col md={6}><InfoItem label="Industry Type" value={client.business_industry_type} /></Col>
                                        <Col md={6}><InfoItem label="Business Phone" value={client.business_phone} /></Col>
                                        <Col md={6}><InfoItem label="Business Website" value={client.business_website ? <a href={client.business_website} target="_blank" rel="noreferrer">{client.business_website}</a> : 'N/A'} /></Col>
                                        <Col md={6}><InfoItem label="Business EIN" value={client.business_ein} /></Col>
                                        <Col md={6}><InfoItem label="Years in Business" value={client.years_in_business} /></Col>
                                        <Col md={12}><InfoItem label="Business Address" value={client.business_address} /></Col>
                                        <Col md={4}><InfoItem label="Business City" value={client.business_city} /></Col>
                                        <Col md={4}><InfoItem label="Business State" value={client.business_state} /></Col>
                                        <Col md={4}><InfoItem label="Business Postal Code" value={client.business_postal_code} /></Col>
                                    </Row>
                                </CardBody>
                            </Card>
                            <Row className="g-4">
                                <Col md={6}>
                                    <Card className="h-100 shadow-sm border-0">
                                        <CardBody>
                                            <h6 className="card-title mb-4 pb-2 border-bottom text-primary"><i className="ri-money-dollar-circle-line me-2"></i>Financials & Subscription</h6>
                                            <Row>
                                                <Col sm={6}><InfoItem label="Annual Revenue" value={client.annual_revenue ? `$${client.annual_revenue}` : 'N/A'} /></Col>
                                                <Col sm={6}><InfoItem label="Monthly Revenue" value={client.monthly_revenue ? `$${client.monthly_revenue}` : 'N/A'} /></Col>
                                                {/* <Col sm={6}><InfoItem label="FICO Score" value={client.fico_score} /></Col>
                                                <Col sm={6}><InfoItem label="Paydex Score" value={client.paydex_score} /></Col> */}
                                                <Col sm={6}><InfoItem label="Enrollment Type" value={client.enrollment_type} /></Col>
                                                <Col sm={6}><InfoItem label="Total Subscription" value={client.total_subscription_amount ? `$${client.total_subscription_amount}` : 'N/A'} /></Col>
                                            </Row>
                                        </CardBody>
                                    </Card>
                                </Col>
                                <Col md={6}>
                                    <Card className="h-100 shadow-sm border-0">
                                        <CardBody>
                                            <h6 className="card-title mb-4 pb-2 border-bottom text-primary"><i className="ri-settings-4-line me-2"></i>Additional Info</h6>
                                            <Row>
                                                <Col sm={6}><InfoItem label="Status" value={<span className="badge bg-primary-subtle text-primary p-2 fs-12">{client.status}</span>} /></Col>
                                                <Col sm={6}><InfoItem label="Current Tier" value={<span className="badge bg-secondary-subtle text-secondary p-2 fs-12">{client.current_tier_name || 'N/A'}</span>} /></Col>
                                                <Col sm={6}><InfoItem label="Partner Name" value={client.partner_name} /></Col>
                                                <Col sm={6}><InfoItem label="Assigned To" value={client.assign_name} /></Col>
                                                <Col sm={12}><InfoItem label="Invoice ID" value={(client as any).invoice?.invoice_id || 'N/A'} /></Col>
                                            </Row>
                                        </CardBody>
                                    </Card>
                                </Col>
                            </Row>
                        </Col>
                    </Row>
                ) : (
                    <div className="text-center py-5 text-muted">Client details not found.</div>
                )}
            </ModalBody>
        </Modal>
    );
};

export default ClientDetailsModal;
