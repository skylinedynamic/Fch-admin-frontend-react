import React from 'react';
import avatar2 from '../../../../assets/images/users/avatar-2.jpg';
import avatar3 from '../../../../assets/images/users/avatar-3.jpg';
import avatar4 from '../../../../assets/images/users/avatar-4.jpg';
import avatar5 from '../../../../assets/images/users/avatar-5.jpg';
import illustrator1 from '../../../../assets/images/user-illustarator-1.png';
import illustrator2 from '../../../../assets/images/user-illustarator-2.png';


export default function ActivitySidebar() {
    return (
        <div className="card">
            <div className="card-header px-2 py-2 align-items-center justify-content-between d-flex">
                <h4 style={{ padding: '8px 0px' }} className="card-title mb-0 me-2">
                    <i className="ri-history-line align-middle me-2"></i>Activity
                </h4>
                <div className="d-flex flex-wrap gap-2 chip-actions">
                    <button
                        type="button"
                        className="btn btn-light btn-sm"
                        data-bs-toggle="modal"
                        data-bs-target="#emailComposeModal"
                    >
                        <i className="ri-mail-line align-middle me-1"></i>New Email
                    </button>
                    <button
                        type="button"
                        className="btn btn-light btn-sm"
                        data-bs-toggle="modal"
                        data-bs-target="#activityCreateModal"
                    >
                        <i className="ri-calendar-line align-middle me-1"></i>New Event
                    </button>
                </div>
            </div>
            <div className="card-body">
                <div className="tab-content text-muted">
                    <div className="tab-pane active show" id="today" role="tabpanel">
                        <div className="profile-timeline">
                            <div className="accordion accordion-flush" id="activityAccordion">
                                {/* Activity Item 1 */}
                                <div className="accordion-item border-0">
                                    <div className="accordion-header" id="headingOne">
                                        <button
                                            className="accordion-button p-2 shadow-none"
                                            type="button"
                                            data-bs-toggle="collapse"
                                            data-bs-target="#collapseOne"
                                            aria-expanded="true"
                                            aria-controls="collapseOne"
                                        >
                                            <div className="d-flex">
                                                <div className="flex-shrink-0">
                                                    <img
                                                        src={avatar2}
                                                        alt=""
                                                        className="avatar-xs rounded-circle material-shadow"
                                                    />
                                                </div>
                                                <div className="flex-grow-1 ms-3">
                                                    <h6 className="fs-14 mb-1">Jacqueline Steve</h6>
                                                    <small className="text-muted">
                                                        Lead status updated: moved to "Proposal" — 05:16 PM
                                                    </small>
                                                </div>
                                            </div>
                                        </button>
                                    </div>
                                    <div
                                        id="collapseOne"
                                        className="accordion-collapse collapse show"
                                        aria-labelledby="headingOne"
                                        data-bs-parent="#activityAccordion"
                                    >
                                        <div className="accordion-body ms-2 ps-5">
                                            <p className="text-muted mb-0">
                                                Lead update: changed stage from "Qualified" to "Proposal".
                                                Next: follow-up call scheduled.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Activity Item 2 */}
                                <div className="accordion-item border-0">
                                    <div className="accordion-header" id="headingTwo">
                                        <button
                                            className="accordion-button p-2 shadow-none collapsed"
                                            type="button"
                                            data-bs-toggle="collapse"
                                            data-bs-target="#collapseTwo"
                                            aria-expanded="false"
                                            aria-controls="collapseTwo"
                                        >
                                            <div className="d-flex">
                                                <div className="flex-shrink-0 avatar-xs">
                                                    <div className="avatar-title bg-light text-success rounded-circle material-shadow">
                                                        M
                                                    </div>
                                                </div>
                                                <div className="flex-grow-1 ms-3">
                                                    <h6 className="fs-14 mb-1">Megan Elmore</h6>
                                                    <small className="text-muted">
                                                        Adding a new event with attachments - 04:45PM
                                                    </small>
                                                </div>
                                            </div>
                                        </button>
                                    </div>
                                    <div
                                        id="collapseTwo"
                                        className="accordion-collapse collapse"
                                        aria-labelledby="headingTwo"
                                        data-bs-parent="#activityAccordion"
                                    >
                                        <div className="accordion-body ms-2 ps-5">
                                            <div className="row g-2">
                                                <div className="col-auto">
                                                    <div className="d-flex border border-dashed p-2 rounded position-relative">
                                                        <div className="flex-shrink-0">
                                                            <i className="ri-image-2-line fs-17 text-danger"></i>
                                                        </div>
                                                        <div className="flex-grow-1 ms-2">
                                                            <h6>
                                                                <a href="#" className="stretched-link">
                                                                    Business Template - UI/UX design
                                                                </a>
                                                            </h6>
                                                            <small>685 KB</small>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Activity Item 3 */}
                                <div className="accordion-item border-0">
                                    <div className="accordion-header" id="headingThree">
                                        <button
                                            className="accordion-button p-2 shadow-none collapsed"
                                            type="button"
                                            data-bs-toggle="collapse"
                                            data-bs-target="#collapseThree"
                                            aria-expanded="false"
                                            aria-controls="collapseThree"
                                        >
                                            <div className="d-flex">
                                                <div className="flex-shrink-0">
                                                    <img
                                                        src={avatar5}
                                                        alt=""
                                                        className="avatar-xs rounded-circle material-shadow"
                                                    />
                                                </div>
                                                <div className="flex-grow-1 ms-3">
                                                    <h6 className="fs-14 mb-1">New ticket received</h6>
                                                    <small className="text-muted mb-2">
                                                        User Jeffrey Salazar - 02:19 PM
                                                    </small>
                                                </div>
                                            </div>
                                        </button>
                                    </div>
                                    <div
                                        id="collapseThree"
                                        className="accordion-collapse collapse"
                                        aria-labelledby="headingThree"
                                        data-bs-parent="#activityAccordion"
                                    >
                                        <div className="accordion-body ms-2 ps-5">
                                            <p className="text-muted fst-italic mb-2">
                                                " We need to update the credit builder tier information for this client. "
                                            </p>
                                            <div className="d-inline-flex gap-2">
                                                <button className="btn btn-sm btn-soft-info">Reply</button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Activity Item 4 */}
                                <div className="accordion-item border-0">
                                    <div className="accordion-header" id="headingFour">
                                        <button
                                            className="accordion-button p-2 shadow-none collapsed"
                                            type="button"
                                            data-bs-toggle="collapse"
                                            data-bs-target="#collapseFour"
                                            aria-expanded="false"
                                            aria-controls="collapseFour"
                                        >
                                            <div className="d-flex">
                                                <div className="flex-shrink-0 avatar-xs">
                                                    <div className="avatar-title bg-light text-muted rounded-circle">
                                                        <i className="ri-user-3-fill"></i>
                                                    </div>
                                                </div>
                                                <div className="flex-grow-1 ms-3">
                                                    <h6 className="fs-14 mb-1">Nancy Martino</h6>
                                                    <small className="text-muted">
                                                        Commented on 12-10-2021 at 09:24 PM
                                                    </small>
                                                </div>
                                            </div>
                                        </button>
                                    </div>
                                    <div
                                        id="collapseFour"
                                        className="accordion-collapse collapse"
                                        aria-labelledby="headingFour"
                                        data-bs-parent="#activityAccordion"
                                    >
                                        <div className="accordion-body ms-2 ps-5">
                                            <p className="text-muted">
                                                " A wonderful serenity has taken possession of my entire soul,
                                                like these sweet mornings of spring which I enjoy with my whole heart. "
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Activity Item 5 - New design with image */}
                                <div className="accordion-item border-0">
                                    <div className="accordion-header" id="headingFive">
                                        <button
                                            className="accordion-button p-2 shadow-none collapsed"
                                            type="button"
                                            data-bs-toggle="collapse"
                                            data-bs-target="#collapseFive"
                                            aria-expanded="false"
                                            aria-controls="collapseFive"
                                        >
                                            <div className="d-flex">
                                                <div className="flex-shrink-0">
                                                    <img
                                                        src={avatar4}
                                                        alt=""
                                                        className="avatar-xs rounded-circle material-shadow"
                                                    />
                                                </div>
                                                <div className="flex-grow-1 ms-3">
                                                    <h6 className="fs-14 mb-1">Ariel Mortis</h6>
                                                    <small className="text-muted">
                                                        Shared a new design asset — 08:30 AM
                                                    </small>
                                                </div>
                                            </div>
                                        </button>
                                    </div>
                                    <div
                                        id="collapseFive"
                                        className="accordion-collapse collapse"
                                        aria-labelledby="headingFive"
                                        data-bs-parent="#activityAccordion"
                                    >
                                        <div className="accordion-body ms-2 ps-5">
                                            <p className="text-muted mb-3">
                                                " Here is the updated landing page concept with the new brand colors and typography. "
                                            </p>
                                            <div className="activity-img-preview mb-3">
                                                <div className="row g-2">
                                                    <div className="col-sm-6">
                                                        <img
                                                            src={illustrator1}
                                                            alt="Design Preview 1"
                                                            className="img-fluid rounded-3 border material-shadow-sm"
                                                            style={{ cursor: 'pointer' }}
                                                        />
                                                    </div>
                                                    <div className="col-sm-6">
                                                        <img
                                                            src={illustrator2}
                                                            alt="Design Preview 2"
                                                            className="img-fluid rounded-3 border material-shadow-sm"
                                                            style={{ cursor: 'pointer' }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="d-flex gap-2">
                                                <button className="btn btn-sm btn-soft-primary">
                                                    <i className="ri-eye-line align-bottom me-1"></i> View
                                                </button>
                                                <button className="btn btn-sm btn-soft-success">
                                                    <i className="ri-download-2-line align-bottom me-1"></i> Download
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
