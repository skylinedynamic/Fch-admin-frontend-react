import React, { useEffect, useRef, useState } from 'react';
import flatpickr from 'flatpickr';
import 'flatpickr/dist/flatpickr.min.css';
import Modal from 'bootstrap/js/dist/modal';

// FullCalendar Imports
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import bootstrap5Plugin from '@fullcalendar/bootstrap5';

// Choices.js Import
import Choices from 'choices.js';
import 'choices.js/public/assets/styles/choices.min.css';

export default function Appointments() {
    const calendarRef = useRef(null);
    const eventModalRef = useRef(null);
    const categoryChoicesRef = useRef(null);
    const [modalInstance, setModalInstance] = useState(null);

    // Initial events data
    const [events, setEvents] = useState(() => {
        const now = new Date();
        const y = now.getFullYear();
        const m = now.getMonth();
        const d = now.getDate();
        return [
            { id: 101, title: "Kickoff Call", start: new Date(y, m, d + 1, 10, 0), end: new Date(y, m, d + 1, 11, 0), allDay: false, className: "bg-primary-subtle", location: "Zoom", description: "Initial onboarding call with the client.", timeZone: "UTC" },
            { id: 102, title: "Product Demo", start: new Date(y, m, d + 3, 14, 0), end: new Date(y, m, d + 3, 15, 0), allDay: false, className: "bg-info-subtle", location: "Remote", description: "Walkthrough of key features.", timeZone: "America/New_York" },
            { id: 103, title: "Invoice Due", start: new Date(y, m, d + 7), allDay: true, className: "bg-danger-subtle", location: "Billing", description: "Review and pay invoice #INV-2045.", timeZone: "" },
            { id: 104, title: "Team Sync", start: new Date(y, m, d + 10, 9, 0), end: new Date(y, m, d + 10, 10, 0), allDay: false, className: "bg-success-subtle", location: "Meeting Room A", description: "Weekly sync.", timeZone: "" },
        ];
    });

    const [upcomingEvents, setUpcomingEvents] = useState([]);
    const [viewMode, setViewMode] = useState(true);
    const [isNewEvent, setIsNewEvent] = useState(false);
    const [selectedEventId, setSelectedEventId] = useState(null);

    // Form Data
    const [formData, setFormData] = useState({
        title: '',
        category: 'bg-primary-subtle',
        location: '',
        description: '',
        date: '',
        timeStart: '',
        timeEnd: '',
    });

    // Display Data
    const [displayData, setDisplayData] = useState({
        date: '',
        timeStart: '',
        timeEnd: '',
        location: '',
        description: ''
    });

    // Initialize Modal and Choices
    useEffect(() => {
        if (eventModalRef.current && !modalInstance) {
            const mod = new Modal(eventModalRef.current, { keyboard: false });
            setModalInstance(mod);
        }

        if (eventModalRef.current) {
            const catSelect = document.getElementById('event-category');
            if (catSelect && !categoryChoicesRef.current) {
                categoryChoicesRef.current = new Choices(catSelect, { searchEnabled: false, itemSelectText: '', shouldSort: false });
            }
        }

        // Cleanup
        return () => {
            // We generally preserve modal instance, but could cleanup choices
        };
    }, [modalInstance]);

    // Initialize Flatpickr
    useEffect(() => {
        // Re-init flatpickr when modal opens or view changes if needed, 
        // but flatpickr attaches to the DOM node.
        const dateInput = document.getElementById("event-start-date");
        if (dateInput) {
            flatpickr(dateInput, {
                mode: "single",
                minDate: "today",
                defaultDate: formData.date,
                onChange: (selectedDates, dateStr) => {
                    setFormData(prev => ({ ...prev, date: dateStr }));
                }
            });
        }
    }, [viewMode, modalInstance]);

    // Update upcoming events list
    useEffect(() => {
        // Match calendar.init.js: Sort by start date, do NOT filter out past events
        const sorted = [...events].sort((a, b) => new Date(a.start) - new Date(b.start));
        setUpcomingEvents(sorted);
    }, [events]);

    const str_dt_fmt = (date) => {
        // Match calendar.init.js: 'en-GB' gives 'dd MMM yyyy' e.g. '12 Oct 2025'
        return new Date(date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
    };

    const tConvert = (timeStr) => {
        if (!timeStr) return '';
        let [h, m] = timeStr.split(':');
        const ampm = h >= 12 ? 'PM' : 'AM';
        h = h % 12 || 12;
        return `${h}:${m} ${ampm}`;
    };

    const formatDate = (dateObj) => {
        const d = new Date(dateObj);
        const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        return `${d.getDate() < 10 ? '0' + d.getDate() : d.getDate()} ${months[d.getMonth()]},${d.getFullYear()}`;
    };

    // Actions
    const handleNewEvent = (dateStr) => {
        setIsNewEvent(true);
        setViewMode(false);
        setSelectedEventId(null);
        setFormData({
            title: '',
            category: 'bg-primary-subtle',
            location: '',
            description: '',
            date: dateStr || new Date().toISOString().split('T')[0],
            timeStart: '',
            timeEnd: '',
        });
        if (categoryChoicesRef.current) categoryChoicesRef.current.setChoiceByValue("bg-primary-subtle");
        if (modalInstance) modalInstance.show();
    };

    const handleEventClick = (info) => {
        const calEvent = info.event;
        setIsNewEvent(false);
        setViewMode(true);
        setSelectedEventId(calEvent.id);

        const title = calEvent.title;
        const className = calEvent.classNames[0];
        const description = calEvent.extendedProps.description || "No Description";
        const location = calEvent.extendedProps.location || "No Location"; // Mapped to TimeZone in edit
        const start = calEvent.start;
        const end = calEvent.end;
        const allDay = calEvent.allDay;

        // Display Logic
        let dateDisplay = formatDate(start);
        if (end && !allDay) {
            // Check if same day
            if (start.toDateString() !== end.toDateString()) {
                dateDisplay = `${formatDate(start)} to ${formatDate(end)}`;
            }
        }

        let timeStartDisplay = '', timeEndDisplay = '';
        if (!allDay && start) {
            timeStartDisplay = tConvert(start.toTimeString().slice(0, 5));
            if (end) timeEndDisplay = tConvert(end.toTimeString().slice(0, 5));
        } else {
            timeStartDisplay = "Full Day Event";
        }

        setDisplayData({
            date: dateDisplay,
            timeStart: timeStartDisplay,
            timeEnd: timeEndDisplay,
            location: location,
            description: description
        });

        setFormData({
            title,
            category: className,
            location: location === "No Location" ? "" : location, // time zone mapping
            description: description === "No Description" ? "" : description,
            date: start.toISOString().split('T')[0],
            timeStart: start ? start.toTimeString().slice(0, 5) : '',
            timeEnd: end ? end.toTimeString().slice(0, 5) : ''
        });

        if (categoryChoicesRef.current) categoryChoicesRef.current.setChoiceByValue(className);
        if (modalInstance) modalInstance.show();
    };

    const handleDropResize = (info) => {
        const calEvent = info.event;
        setEvents(prev => prev.map(e => String(e.id) === String(calEvent.id) ? {
            ...e,
            start: calEvent.start,
            end: calEvent.end,
            allDay: calEvent.allDay
        } : e));
    };

    const toggleEditMode = (e) => {
        e.preventDefault();
        setViewMode(!viewMode);
    };

    const handleDelete = () => {
        if (selectedEventId) {
            setEvents(prev => prev.filter(e => String(e.id) !== String(selectedEventId)));
            modalInstance.hide();
        }
    };

    const handleTimeSlotChange = (e) => {
        const val = e.target.value;
        const [h, m] = val.split(':').map(Number);
        let endH = h + 1;
        if (endH > 23) endH = 23;
        const endVal = `${String(endH).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        setFormData(prev => ({ ...prev, timeStart: val, timeEnd: endVal }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const forms = document.getElementsByClassName('needs-validation');
        if (forms[0] && !forms[0].checkValidity()) {
            forms[0].classList.add('was-validated');
            return;
        }

        const title = document.getElementById("event-title").value;
        const category = categoryChoicesRef.current ? categoryChoicesRef.current.getValue(true) : "bg-primary-subtle";
        const dateVal = document.getElementById("event-start-date").value;
        const locationVal = document.getElementById("event-location").value; // Time Zone
        const descVal = document.getElementById("event-description").value;

        let newStart = new Date(dateVal);
        let newEnd = null;
        let allDay = true;

        if (formData.timeStart) {
            allDay = false;
            newStart = new Date(`${dateVal}T${formData.timeStart}`);
            if (formData.timeEnd) {
                newEnd = new Date(`${dateVal}T${formData.timeEnd}`);
            } else {
                newEnd = new Date(newStart.getTime() + 60 * 60 * 1000);
            }
        }

        if (selectedEventId && !isNewEvent) {
            setEvents(prev => prev.map(ev => String(ev.id) === String(selectedEventId) ? {
                ...ev,
                title,
                className: category,
                classNames: [category],
                start: newStart,
                end: newEnd,
                allDay,
                extendedProps: { ...ev.extendedProps, location: locationVal, description: descVal }
            } : ev));
        } else {
            setEvents(prev => [...prev, {
                id: Date.now(),
                title,
                className: category,
                classNames: [category],
                start: newStart,
                end: newEnd,
                allDay,
                extendedProps: { location: locationVal, description: descVal }
            }]);
        }
        modalInstance.hide();
    };

    return (
        <div className="page-content">
            <div className="container-fluid">
                <div className="row">
                    <div className="col-12">
                        <div className="row">
                            <div className="col-xl-3">
                                <div className="card card-h-100">
                                    <div className="card-body">
                                        <button className="btn btn-primary w-100" id="btn-new-event" onClick={() => handleNewEvent()}><i className="mdi mdi-plus"></i> Create New Appointment</button>
                                        <div id="external-events">{/* External events would go here */}</div>
                                    </div>
                                </div>
                                <div>
                                    <h5 className="mb-1">Upcoming Appointment</h5>
                                    <p className="text-muted">Don't miss scheduled appointments</p>
                                    <div className="pe-2 me-n1 mb-3" data-simplebar style={{ height: "600px" }}>
                                        <div id="upcoming-event-list">
                                            {upcomingEvents.map(evt => {
                                                const s = new Date(evt.start);
                                                const e = evt.end ? new Date(evt.end) : null;

                                                // Date Range Logic matching calendar.init.js
                                                let dateStr = str_dt_fmt(s);
                                                if (e) {
                                                    const eDay = new Date(e);
                                                    // calendar.init.js subtracts 1 day from end date for display if it's a range?
                                                    // Line 80: l = e.end ? (endUpdatedDay = new Date(e.end)).setDate(endUpdatedDay.getDate() - 1) : l
                                                    // This usually handles FullCalendar's exclusive end date for all-day events.
                                                    if (evt.allDay) {
                                                        eDay.setDate(eDay.getDate() - 1);
                                                    }

                                                    const sStr = str_dt_fmt(s);
                                                    const eStr = str_dt_fmt(eDay);

                                                    if (sStr !== eStr) {
                                                        dateStr = `${sStr} to ${eStr}`;
                                                    }
                                                }

                                                let badge;
                                                if (evt.allDay || !e) {
                                                    badge = <small className="badge bg-primary-subtle text-primary border border-primary-subtle small ms-auto">Full day event</small>;
                                                } else {
                                                    const t1 = tConvert(s.toTimeString().slice(0, 5));
                                                    const t2 = tConvert(e.toTimeString().slice(0, 5));
                                                    badge = <small className="badge bg-primary-subtle text-primary border border-primary-subtle small ms-auto">{t1} to {t2}</small>;
                                                }
                                                // Extract color
                                                const colorClass = (evt.className || 'bg-primary-subtle').split('-')[1];

                                                return (
                                                    <div className="card mb-3" key={evt.id}>
                                                        <div className="card-body">
                                                            <div className="d-flex mb-3">
                                                                <div className="flex-grow-1">
                                                                    <i className={`mdi mdi-checkbox-blank-circle me-2 text-${colorClass}`}></i>
                                                                    <span className="fw-medium">{dateStr}</span>
                                                                </div>
                                                                <div className="flex-shrink-0">
                                                                    {badge}
                                                                </div>
                                                            </div>
                                                            <h6 className="card-title fs-16">{evt.title}</h6>
                                                            <p className="text-muted text-truncate-two-lines mb-0">{evt.extendedProps?.description || evt.description}</p>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="col-xl-9">
                                <div className="card card-h-100">
                                    <div className="card-body">
                                        <div id="calendar" style={{ minHeight: '600px' }}>
                                            <FullCalendar
                                                ref={calendarRef}
                                                plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin, bootstrap5Plugin]}
                                                initialView={window.innerWidth >= 1200 ? "dayGridMonth" : window.innerWidth >= 768 ? "timeGridWeek" : "listMonth"}
                                                themeSystem="bootstrap5"
                                                headerToolbar={{
                                                    left: 'prev,next today',
                                                    center: 'title',
                                                    right: 'dayGridMonth,timeGridWeek,timeGridDay,listMonth'
                                                }}
                                                events={events}
                                                editable={true}
                                                droppable={true}
                                                selectable={true}
                                                dateClick={(arg) => handleNewEvent(arg.dateStr)}
                                                eventClick={handleEventClick}
                                                eventDrop={handleDropResize}
                                                eventResize={handleDropResize}
                                                windowResize={(arg) => {
                                                    // FullCalendar react component handles resize automatically but we can force view change if needed
                                                    if (window.innerWidth >= 1200) {
                                                        arg.view.calendar.changeView('dayGridMonth');
                                                    } else if (window.innerWidth >= 768) {
                                                        arg.view.calendar.changeView('timeGridWeek');
                                                    } else {
                                                        arg.view.calendar.changeView('listMonth');
                                                    }
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div style={{ clear: 'both' }}></div>

                        {/* Modal */}
                        <div className="modal fade" id="event-modal" tabIndex="-1" ref={eventModalRef}>
                            <div className="modal-dialog modal-dialog-centered">
                                <div className="modal-content border-0">
                                    <div className="modal-header p-3 bg-info-subtle">
                                        <h5 className="modal-title" id="modal-title">{viewMode ? (selectedEventId ? "Event" : "Event") : (isNewEvent ? "Add Appointment" : "Edit Appointment")}</h5>
                                        <button type="button" className="btn-close" data-bs-dismiss="modal" aria-hidden="true"></button>
                                    </div>
                                    <div className="modal-body p-4">
                                        <form className="needs-validation" name="event-form" id="form-event" noValidate onSubmit={handleSubmit}>
                                            <div className="text-end">
                                                <a href="#" className={`btn btn-sm btn-soft-primary ${isNewEvent ? 'd-none' : ''}`} id="edit-event-btn" data-id="edit-event" onClick={toggleEditMode} role="button">
                                                    {viewMode ? "Edit" : "Cancel"}
                                                </a>
                                            </div>

                                            {/* Details View */}
                                            <div className={`event-details ${!viewMode ? 'd-none' : ''}`}>
                                                <div className="d-flex mb-2">
                                                    <div className="flex-grow-1 d-flex align-items-center">
                                                        <div className="flex-shrink-0 me-3">
                                                            <i className="ri-calendar-event-line text-muted fs-16"></i>
                                                        </div>
                                                        <div className="flex-grow-1">
                                                            <h6 className="d-block fw-semibold mb-0" id="event-start-date-tag">{displayData.date}</h6>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="d-flex align-items-center mb-2">
                                                    <div className="flex-shrink-0 me-3">
                                                        <i className="ri-time-line text-muted fs-16"></i>
                                                    </div>
                                                    <div className="flex-grow-1">
                                                        <h6 className="d-block fw-semibold mb-0"><span id="event-timepicker1-tag">{displayData.timeStart}</span> - <span id="event-timepicker2-tag">{displayData.timeEnd}</span></h6>
                                                    </div>
                                                </div>
                                                <div className="d-flex align-items-center mb-2">
                                                    <div className="flex-shrink-0 me-3">
                                                        <i className="ri-map-pin-line text-muted fs-16"></i>
                                                    </div>
                                                    <div className="flex-grow-1">
                                                        <h6 className="d-block fw-semibold mb-0"> <span id="event-location-tag">{displayData.location}</span></h6>
                                                    </div>
                                                </div>
                                                <div className="d-flex mb-3">
                                                    <div className="flex-shrink-0 me-3">
                                                        <i className="ri-discuss-line text-muted fs-16"></i>
                                                    </div>
                                                    <div className="flex-grow-1">
                                                        <p className="d-block text-muted mb-0" id="event-description-tag">{displayData.description}</p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Form View - Strictly matching HTML structure */}
                                            <div className={`row event-form ${viewMode ? 'd-none' : ''}`}>
                                                <div className="col-12">
                                                    <div className="mb-3">
                                                        <label className="form-label">Appointment Title</label>
                                                        <input className="form-control" placeholder="Enter Appointment Title" type="text" name="title" id="event-title" required defaultValue={formData.title} />
                                                        <div className="invalid-feedback">Please provide a valid Appointment Title</div>
                                                    </div>
                                                </div>
                                                <div className="col-12">
                                                    <div className="mb-3">
                                                        <label className="form-label">Type</label>
                                                        <select className="form-select" name="category" id="event-category" required defaultValue={formData.category}>
                                                            <option value="bg-danger-subtle">Initial Consultation</option>
                                                            <option value="bg-success-subtle">Follow-up Meeting</option>
                                                            <option value="bg-primary-subtle">Business Review</option>
                                                            <option value="bg-info-subtle">Technical Support</option>
                                                            <option value="bg-dark-subtle">Feedback Session</option>
                                                            <option value="bg-warning-subtle">Partnership Meeting</option>
                                                        </select>
                                                        <div className="invalid-feedback">Please select a valid event category</div>
                                                    </div>
                                                </div>
                                                <div className="col-6">
                                                    <div className="mb-3">
                                                        <label>Event Date</label>
                                                        <div className="input-group">
                                                            <input type="text" id="event-start-date" className="form-control flatpickr flatpickr-input" placeholder="Select date" readOnly required defaultValue={formData.date} />
                                                            <span className="input-group-text"><i className="ri-calendar-event-line"></i></span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="col-6" id="event-time">
                                                    <div className="mb-3">
                                                        <label className="form-label">Time Slot</label>
                                                        <select id="time-slot-select" className="form-select" onChange={handleTimeSlotChange} defaultValue={formData.timeStart}>
                                                            <option value="" disabled>Select a time</option>
                                                            {[...Array(24)].map((_, i) => {
                                                                const h = i < 10 ? `0${i}` : i;
                                                                const display = i === 0 ? '12:00 AM' : i === 12 ? '12:00 PM' : i > 12 ? `${i - 12}:00 PM` : `${i}:00 AM`;
                                                                return <option key={i} value={`${h}:00`}>{display}</option>;
                                                            })}
                                                        </select>
                                                        <input id="timepicker1" type="text" className="form-control flatpickr flatpickr-input d-none" readOnly value={formData.timeStart} />
                                                        <input id="timepicker2" type="text" className="form-control flatpickr flatpickr-input d-none" readOnly value={formData.timeEnd} />
                                                    </div>
                                                </div>
                                                <div className="col-12">
                                                    <div className="mb-3">
                                                        <label htmlFor="event-location">Time Zone</label>
                                                        <select className="form-select" name="event-location" id="event-location" defaultValue={formData.location}>
                                                            <option value="" disabled>Select time zone</option>
                                                            <option value="UTC">UTC (GMT+00:00)</option>
                                                            <option value="America/New_York">America/New_York (GMT-05:00)</option>
                                                            <option value="America/Chicago">America/Chicago (GMT-06:00)</option>
                                                            <option value="America/Denver">America/Denver (GMT-07:00)</option>
                                                            <option value="America/Los_Angeles">America/Los_Angeles (GMT-08:00)</option>
                                                            <option value="Europe/London">Europe/London (GMT+00:00)</option>
                                                            <option value="Europe/Berlin">Europe/Berlin (GMT+01:00)</option>
                                                            <option value="Asia/Dubai">Asia/Dubai (GMT+04:00)</option>
                                                            <option value="Asia/Kolkata">Asia/Kolkata (GMT+05:30)</option>
                                                            <option value="Asia/Singapore">Asia/Singapore (GMT+08:00)</option>
                                                            <option value="Asia/Tokyo">Asia/Tokyo (GMT+09:00)</option>
                                                            <option value="Australia/Sydney">Australia/Sydney (GMT+10:00)</option>
                                                        </select>
                                                    </div>
                                                </div>
                                                <input type="hidden" id="eventid" name="eventid" value={selectedEventId || ""} />
                                                <div className="col-12">
                                                    <div className="mb-3">
                                                        <label className="form-label">Description</label>
                                                        <textarea className="form-control" id="event-description" placeholder="Enter a description" rows="3" spellCheck="false" defaultValue={formData.description}></textarea>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="hstack gap-2 justify-content-end">
                                                <button type="button" className={`btn btn-soft-danger ${isNewEvent ? 'd-none' : ''}`} id="btn-delete-event" onClick={handleDelete}><i className="ri-close-line align-bottom"></i> Delete</button>
                                                <button type="submit" className={`btn btn-success ${viewMode ? 'd-none' : ''}`} id="btn-save-event">{isNewEvent ? "Confirm Appointment" : "Update Appointment"}</button>
                                            </div>
                                        </form>
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
