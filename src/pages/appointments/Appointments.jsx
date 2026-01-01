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

// Toast
import { toast } from 'react-toastify';

// Auth Store
import { useAuthStore } from '../../store/auth/authStore';

// API Services
import { fetchAppointments, fetchAppointmentById, createAppointment, deleteAppointment, updateAppointment, fetchTimeSlots } from '../../modules/appointment/services';
import { fetchPartners } from '../../modules/partner/services';
import { fetchEmployees } from '../../modules/employee/services';
import { fetchAllBorrowers } from '../../modules/borrower/services';

// Config
import { APPOINTMENT_TYPE_OPTIONS, TIMEZONE_OPTIONS } from '../../config';

export default function Appointments() {
    const calendarRef = useRef(null);
    const eventModalRef = useRef(null);
    const categoryChoicesRef = useRef(null);
    const assignedForChoicesRef = useRef(null);
    const timeSlotChoicesRef = useRef(null);
    const [modalInstance, setModalInstance] = useState(null);

    // Auth
    const { user } = useAuthStore();
    const isHost = user?.is_host === 1 || user?.entity_type === 'host' || user?.entity_type === 'Host';

    // Events data
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);

    const [upcomingEvents, setUpcomingEvents] = useState([]);
    const [viewMode, setViewMode] = useState(true);
    const [isNewEvent, setIsNewEvent] = useState(false);
    const [selectedEventId, setSelectedEventId] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formErrors, setFormErrors] = useState({});

    // Time Slots
    const [timeSlots, setTimeSlots] = useState([]);
    const [loadingTimeSlots, setLoadingTimeSlots] = useState(false);

    // Assigned For Selection
    const [assignedForType, setAssignedForType] = useState('employee'); // 'partner', 'employee', 'borrower'
    const [assignedForId, setAssignedForId] = useState('');
    const [partners, setPartners] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [borrowers, setBorrowers] = useState([]);
    const [loadingAssignedFor, setLoadingAssignedFor] = useState(false);

    // Form Data
    const [formData, setFormData] = useState({
        subject: '',
        category: 'Business Review',
        location: 'UTC (GMT+00:00)', // timezone
        description: '',
        date: '',
        timeStart: '',
        timeEnd: '',
        timeSlotId: '',
    });

    // Display Data
    const [displayData, setDisplayData] = useState({
        date: '',
        timeStart: '',
        timeEnd: '',
        location: '',
        description: '',
        scheduledBy: '',
        assignedFor: '',
    });

    // Fetch Appointments and Time Slots
    useEffect(() => {
        loadAppointments();
        loadTimeSlots();
    }, []);

    const loadTimeSlots = async () => {
        try {
            setLoadingTimeSlots(true);
            const response = await fetchTimeSlots();
            if (response.status && response.data) {
                setTimeSlots(response.data);
            }
        } catch (error) {
            console.error("Failed to load time slots", error);
        } finally {
            setLoadingTimeSlots(false);
        }
    };

    const loadAppointments = async () => {
        try {
            setLoading(true);
            const response = await fetchAppointments();
            if (response.status && response.data) {
                // toast.success(response.message || 'Appointments loaded successfully');
                const mappedEvents = response.data.map(apt => {
                    const start = new Date(apt.appointment_date);
                    // Calculate end time based on duration_minutes
                    const end = new Date(start.getTime() + apt.duration_minutes * 60000);

                    // Map status to color
                    let className = 'bg-primary-subtle';
                    switch (apt.status) {
                        case 'cancelled': className = 'bg-danger-subtle'; break;
                        case 'completed': className = 'bg-success-subtle'; break;
                        case 'rescheduled': className = 'bg-warning-subtle'; break;
                        default: className = 'bg-primary-subtle';
                    }

                    return {
                        id: apt.id,
                        title: apt.subject,
                        start: start,
                        end: end,
                        allDay: false, // Assuming all meetups are timed as they have duration
                        className: className,
                        classNames: [className],
                        description: apt.description,
                        location: apt.timezone, // Helper for some FC views if needed, or remove
                        extendedProps: {
                            description: apt.description,
                            location: apt.location, // The actual meeting location content
                            timezone: apt.timezone, // The timezone string
                            appointment_code: apt.appointment_code,
                            status: apt.status,
                            meeting_type: apt.meeting_type,
                            assigned_for: apt.assigned_for // Keep track of assigned person
                        }
                    };
                });
                setEvents(mappedEvents);
            }
        } catch (error) {
            console.error("Failed to load appointments", error);
            toast.error('Failed to load appointments');
        } finally {
            setLoading(false);
        }
    };

    // Load Partners/Employees/Borrowers based on selection
    const loadAssignedForOptions = async (type) => {
        try {
            setLoadingAssignedFor(true);
            if (type === 'partner') {
                const response = await fetchPartners({});
                setPartners(response.data || []);
            } else if (type === 'employee') {
                const response = await fetchEmployees({});
                setEmployees(response.employees || []);
            } else if (type === 'borrower') {
                const response = await fetchAllBorrowers({});
                setBorrowers(response.data || []);
            }
        } catch (error) {
            console.error(`Failed to load ${type}s`, error);
            toast.error(`Failed to load ${type}s`);
        } finally {
            setLoadingAssignedFor(false);
        }
    };

    // Load assigned for options when type changes
    useEffect(() => {
        if (!viewMode && assignedForType) {
            loadAssignedForOptions(assignedForType);
        }
    }, [assignedForType, viewMode]);

    // Initialize Modal, Category Choices, and Time Slot Choices
    useEffect(() => {
        if (eventModalRef.current && !modalInstance) {
            const mod = new Modal(eventModalRef.current, { keyboard: false });
            setModalInstance(mod);
        }

        if (eventModalRef.current) {
            // Category Choices
            const catSelect = document.getElementById('event-category');
            if (catSelect && !categoryChoicesRef.current) {
                categoryChoicesRef.current = new Choices(catSelect, {
                    searchEnabled: false,
                    itemSelectText: '',
                    shouldSort: false
                });

                catSelect.addEventListener('change', (e) => {
                    setFormData(prev => ({ ...prev, category: e.target.value }));
                });
            }

            // Time Slot Choices
            const timeSelect = document.getElementById('time-slot-select');
            if (timeSelect && timeSlots.length > 0) {
                if (timeSlotChoicesRef.current) {
                    timeSlotChoicesRef.current.destroy();
                }

                timeSlotChoicesRef.current = new Choices(timeSelect, {
                    searchEnabled: false,
                    itemSelectText: '',
                    shouldSort: false,
                    placeholder: true,
                    placeholderValue: 'Select Time Slot'
                });

                timeSelect.addEventListener('change', (e) => {
                    const val = e.target.value;
                    const slot = timeSlots.find(s => s.start_time === val);
                    if (slot) {
                        setFormData(prev => ({ ...prev, timeStart: slot.start_time, timeEnd: slot.end_time, timeSlotId: slot.id }));
                    }
                });

                // Sync initial value if exists
                if (formData.timeStart) {
                    timeSlotChoicesRef.current.setChoiceByValue(formData.timeStart);
                }
            }
        }
    }, [modalInstance, timeSlots]);

    // Initialize/Update Assigned For Choices
    useEffect(() => {
        const assignedSelect = document.getElementById('event-assigned-for');
        if (assignedSelect && !loadingAssignedFor) {
            // Destroy previous instance if it exists
            if (assignedForChoicesRef.current) {
                assignedForChoicesRef.current.destroy();
                assignedForChoicesRef.current = null;
            }

            // Initialize new instance
            assignedForChoicesRef.current = new Choices(assignedSelect, {
                searchEnabled: false,
                itemSelectText: '',
                shouldSort: false,
                placeholder: true,
                placeholderValue: `Select ${assignedForType}...`
            });

            // Set value if assignedForId is set
            if (assignedForId) {
                assignedForChoicesRef.current.setChoiceByValue(String(assignedForId));
            }

            // Listen for changes
            assignedSelect.addEventListener('change', (e) => {
                setAssignedForId(e.target.value);
            });
        }
    }, [assignedForType, loadingAssignedFor, viewMode, modalInstance, partners.length, employees.length, borrowers.length]);

    // Dedicated useEffect to sync Choices.js when formData or viewMode changes
    useEffect(() => {
        if (!viewMode) {
            if (categoryChoicesRef.current && formData.category) {
                categoryChoicesRef.current.setChoiceByValue(formData.category);
            }
            if (timeSlotChoicesRef.current && formData.timeStart) {
                timeSlotChoicesRef.current.setChoiceByValue(formData.timeStart);
            }
            if (assignedForChoicesRef.current && assignedForId) {
                assignedForChoicesRef.current.setChoiceByValue(String(assignedForId));
            }
        }
    }, [formData.category, formData.timeStart, assignedForId, viewMode]);

    // Sync error classes to Choices.js and Flatpickr containers
    useEffect(() => {
        const syncInvalidClass = (ref, hasError) => {
            if (ref.current && ref.current.containerOuter && ref.current.containerOuter.element) {
                const el = ref.current.containerOuter.element;
                if (hasError) el.classList.add('is-invalid');
                else el.classList.remove('is-invalid');
            }
        };

        syncInvalidClass(categoryChoicesRef, !!formErrors.meeting_type);
        syncInvalidClass(timeSlotChoicesRef, !!formErrors.duration_minutes);
        syncInvalidClass(assignedForChoicesRef, !!formErrors.assigned_for || !!formErrors.assigned_for_id);

        const dateEl = document.getElementById('event-start-date');
        if (dateEl) {
            if (formErrors.appointment_date) dateEl.classList.add('is-invalid');
            else dateEl.classList.remove('is-invalid');
        }
    }, [formErrors]);

    // Initialize Flatpickr
    useEffect(() => {
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
        // Sort by start date
        const sorted = [...events].sort((a, b) => new Date(a.start) - new Date(b.start));
        // Filter only future events if needed, but keeping logic consistent with previous requirement
        const future = sorted.filter(e => new Date(e.start) >= new Date());
        setUpcomingEvents(future.slice(0, 10)); // unexpected list size might be huge, limiting to 10
    }, [events]);

    const str_dt_fmt = (date) => {
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
        setAssignedForType('employee');
        setAssignedForId('');
        setFormData({
            subject: '',
            category: 'Business Review',
            location: 'UTC (GMT+00:00)',
            description: '',
            date: dateStr || new Date().toISOString().split('T')[0],
            timeStart: '',
            timeEnd: '',
            timeSlotId: '',
        });
        setFormErrors({});
        if (categoryChoicesRef.current) categoryChoicesRef.current.setChoiceByValue("Business Review");
        if (modalInstance) modalInstance.show();
    };

    const handleEventClick = async (info) => {
        const calEvent = info.event;
        const eventId = calEvent.id;
        setIsNewEvent(false);
        setViewMode(true);
        setSelectedEventId(eventId);
        setFormErrors({});

        // --- 1. SET INITIAL DATA IMMEDIATELY (Prevent empty modal) ---
        const startInit = calEvent.start;
        const endInit = calEvent.end || new Date(startInit.getTime() + 60 * 60000);

        setDisplayData({
            title: calEvent.title || "Appointment",
            date: formatDate(startInit),
            timeStart: tConvert(startInit.toTimeString().slice(0, 5)),
            timeEnd: tConvert(endInit.toTimeString().slice(0, 5)),
            location: calEvent.extendedProps?.location || "Virtual",
            description: calEvent.extendedProps?.description || "No Description",
            scheduledBy: "FCH Admin",
            assignedFor: calEvent.extendedProps?.assigned_for?.name || "N/A",
        });

        setFormData(prev => ({
            ...prev,
            subject: calEvent.title,
            category: calEvent.classNames[0] || 'Business Review',
            date: startInit.toISOString().split('T')[0],
            timeStart: startInit.toTimeString().slice(0, 5),
            timeEnd: endInit.toTimeString().slice(0, 5),
        }));

        if (modalInstance) modalInstance.show();

        // --- 2. FETCH FULL DETAILS IN BACKGROUND ---
        try {
            const apt = await fetchAppointmentById(eventId);

            // Robust date parsing (replace space with T for ISO compatibility)
            const dateStr = apt.appointment_date ? apt.appointment_date.replace(' ', 'T') : '';
            const start = dateStr ? new Date(dateStr) : new Date();
            const duration = apt.duration_minutes || 60;
            const end = new Date(start.getTime() + duration * 60000);

            setDisplayData({
                title: apt.subject || calEvent.title,
                date: formatDate(start),
                timeStart: tConvert(start.toTimeString().slice(0, 5)),
                timeEnd: tConvert(end.toTimeString().slice(0, 5)),
                location: apt.location || (apt.meeting_type === 'online' ? "Virtual" : apt.timezone) || "Virtual",
                description: apt.description || "No Description",
                scheduledBy: apt.scheduled_by?.name || "FCH Admin",
                assignedFor: apt.assigned_for?.name || "N/A",
            });

            const timeStr = start.toTimeString().slice(0, 5);
            const matchedSlot = timeSlots.find(s => s.start_time === timeStr);

            setFormData({
                subject: apt.subject,
                category: apt.meeting_type || 'Business Review',
                location: apt.timezone || "UTC (GMT+00:00)",
                description: apt.description || "",
                date: start.toISOString().split('T')[0],
                timeStart: timeStr,
                timeEnd: end.toTimeString().slice(0, 5),
                timeSlotId: matchedSlot ? matchedSlot.id : '',
            });

            // Determine Assigned For Type
            let type = 'employee';
            if (apt.assigned_for?.entity_type) {
                type = apt.assigned_for.entity_type.toLowerCase();
            } else if (apt.assigned_for) {
                // Heuristic if entity_type is missing
                const foundInEmployees = employees.some(e => e.id === apt.assigned_for.id);
                const foundInPartners = partners.some(p => p.id === apt.assigned_for.id);
                const foundInBorrowers = borrowers.some(b => b.id === apt.assigned_for.id);

                if (foundInPartners) type = 'partner';
                else if (foundInBorrowers) type = 'borrower';
                else type = 'employee';
            }

            setAssignedForType(type);
            setAssignedForId(apt.assigned_for?.id || '');

            if (categoryChoicesRef.current) categoryChoicesRef.current.setChoiceByValue(calEvent.classNames[0] || 'bg-primary-subtle');

        } catch (error) {
            console.error("Failed to fetch appointment details", error);
        }
    };

    const handleDropResize = (info) => {
        // Optimistic update
        const calEvent = info.event;
        setEvents(prev => prev.map(e => String(e.id) === String(calEvent.id) ? {
            ...e,
            start: calEvent.start,
            end: calEvent.end,
            allDay: calEvent.allDay
        } : e));

        // TODO: Call API to update date/time
        // updateAppointment(calEvent.id, { ...mappedPayload });
    };

    const toggleEditMode = (e) => {
        if (e) e.preventDefault();
        const nextMode = !viewMode;
        setViewMode(nextMode);

        // If entering edit mode, ensure choices are synced
        if (nextMode === false) {
            setTimeout(() => {
                if (categoryChoicesRef.current) categoryChoicesRef.current.setChoiceByValue(formData.category);
                if (timeSlotChoicesRef.current && formData.timeStart) timeSlotChoicesRef.current.setChoiceByValue(formData.timeStart);
                if (assignedForChoicesRef.current && assignedForId) assignedForChoicesRef.current.setChoiceByValue(String(assignedForId));
            }, 50);
        }
    };

    const handleDelete = async () => {
        if (selectedEventId) {
            try {
                setIsDeleting(true);
                await deleteAppointment(selectedEventId);
                toast.success('Appointment deleted successfully');
                if (modalInstance) modalInstance.hide();
                loadAppointments(); // This triggers the skeleton loader for the list
            } catch (error) {
                console.error("Failed to delete appointment", error);
                toast.error('Failed to delete appointment');
            } finally {
                setIsDeleting(false);
            }
        }
    };

    const handleTimeSlotChange = (e) => {
        const val = e.target.value;
        const slot = timeSlots.find(s => s.start_time === val);
        if (slot) {
            setFormData(prev => ({
                ...prev,
                timeStart: slot.start_time,
                timeEnd: slot.end_time,
                timeSlotId: slot.id
            }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormErrors({});

        const subject = formData.subject;
        const category = categoryChoicesRef.current ? categoryChoicesRef.current.getValue(true) : "Business Review";
        const dateVal = formData.date;
        const locationVal = formData.location; // Time Zone
        const descVal = formData.description;

        // Construct Start and End Date
        let startDateTime = new Date(`${dateVal}T00:00:00`);
        let durationMinutes = 60; // Default

        if (formData.timeStart) {
            startDateTime = new Date(`${dateVal}T${formData.timeStart}`);
            if (formData.timeEnd) {
                const endDateTime = new Date(`${dateVal}T${formData.timeEnd}`);
                durationMinutes = (endDateTime - startDateTime) / 60000;
            } else {
                durationMinutes = 0; // Force validation if end time missing
            }
        } else {
            durationMinutes = 0; // Force validation if no time selected
        }

        // Format date for API: "2026-01-01 14:00:00"
        // Helper to format: YYYY-MM-DD HH:mm:ss
        const toMySQLDate = (date) => {
            const pad = (num) => (num < 10 ? '0' + num : num);
            return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
        };


        const currentType = APPOINTMENT_TYPE_OPTIONS.find(opt => opt.value === category);

        const payload = {
            subject: subject,
            description: descVal,
            appointment_date: dateVal ? toMySQLDate(startDateTime) : null,
            timezone: locationVal || null,
            duration_minutes: durationMinutes > 0 ? durationMinutes : null,
            meeting_type: category || null,
            assigned_for: assignedForId ? parseInt(assignedForId) : null,
            time_slot_id: formData.timeSlotId ? parseInt(formData.timeSlotId) : undefined,
        };

        try {
            setIsSubmitting(true);
            if (selectedEventId && !isNewEvent) {
                // Update
                const response = await updateAppointment(selectedEventId, payload);
                toast.success(response.message || 'Appointment updated successfully');
                // Reload or manually update state
                loadAppointments();
            } else {
                // Create
                const response = await createAppointment(payload);
                toast.success(response.message || 'Appointment created successfully');
                // Reload or manually update state
                loadAppointments();
            }
            modalInstance.hide();
        } catch (error) {
            console.error("Failed to save appointment", error);
            if (error.response && error.response.data && error.response.data.errors) {
                setFormErrors(error.response.data.errors);
            } else {
                toast.error(error.response?.data?.message || 'Failed to save appointment');
            }
        } finally {
            setIsSubmitting(false);
        }
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
                                            {loading && (
                                                <>
                                                    {[1, 2, 3].map(n => (
                                                        <div className="card mb-3" key={n} aria-hidden="true">
                                                            <div className="card-body">
                                                                <div className="d-flex mb-3 placeholder-glow">
                                                                    <div className="flex-grow-1">
                                                                        <span className="placeholder col-4 rounded bg-secondary-subtle"></span>
                                                                    </div>
                                                                    <div className="flex-shrink-0">
                                                                        <span className="placeholder col-3 rounded bg-secondary-subtle"></span>
                                                                    </div>
                                                                </div>
                                                                <h6 className="card-title placeholder-glow">
                                                                    <span className="placeholder col-7 rounded bg-secondary-subtle"></span>
                                                                </h6>
                                                                <p className="text-muted mb-0 placeholder-glow">
                                                                    <span className="placeholder col-12 rounded bg-secondary-subtle"></span>
                                                                    <span className="placeholder col-8 rounded bg-secondary-subtle"></span>
                                                                </p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </>
                                            )}
                                            {!loading && upcomingEvents.map(evt => {
                                                const s = new Date(evt.start);
                                                const e = evt.end ? new Date(evt.end) : null;

                                                let dateStr = str_dt_fmt(s);
                                                if (e) {
                                                    const eDay = new Date(e);
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
                                        {loading ? (
                                            <div style={{ minHeight: '600px' }} className="placeholder-glow">
                                                <div className="d-flex justify-content-between mb-4">
                                                    <div className="d-flex gap-1">
                                                        <span className="placeholder rounded bg-secondary-subtle" style={{ width: '30px', height: '35px' }}></span>
                                                        <span className="placeholder rounded bg-secondary-subtle" style={{ width: '30px', height: '35px' }}></span>
                                                        <span className="placeholder rounded bg-secondary-subtle" style={{ width: '60px', height: '35px' }}></span>
                                                    </div>
                                                    <span className="placeholder rounded bg-secondary-subtle col-3" style={{ height: '35px' }}></span>
                                                    <div className="d-flex gap-1">
                                                        <span className="placeholder rounded bg-secondary-subtle" style={{ width: '60px', height: '35px' }}></span>
                                                        <span className="placeholder rounded bg-secondary-subtle" style={{ width: '60px', height: '35px' }}></span>
                                                        <span className="placeholder rounded bg-secondary-subtle" style={{ width: '60px', height: '35px' }}></span>
                                                        <span className="placeholder rounded bg-secondary-subtle" style={{ width: '60px', height: '35px' }}></span>
                                                    </div>
                                                </div>

                                                <div className="border rounded">
                                                    <div className="d-flex border-bottom">
                                                        {[...Array(7)].map((_, i) => (
                                                            <div key={i} className="flex-fill border-end p-2 text-center">
                                                                <span className="placeholder rounded bg-secondary-subtle w-50"></span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    {[...Array(5)].map((_, row) => (
                                                        <div key={row} className="d-flex border-bottom" style={{ height: '100px' }}>
                                                            {[...Array(7)].map((_, col) => (
                                                                <div key={col} className="flex-fill border-end p-1">
                                                                    {((row + col) % 5 === 0) && (
                                                                        <div className="rounded bg-secondary-subtle mt-3 mx-1" style={{ height: '20px', opacity: 0.5 }}></div>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ) : (
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
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div style={{ clear: 'both' }}></div>

                        {/* Modal */}

                        <div className="modal" id="event-modal" tabIndex="-1" ref={eventModalRef}>

                            <div className="modal-dialog modal-dialog-centered">
                                <div className="modal-content border-0">
                                    <div className="modal-header p-3 bg-info-subtle">
                                        <h5 className="modal-title" id="modal-title">{viewMode ? (displayData.title || "Appointment") : (isNewEvent ? "Add Appointment" : "Edit Appointment")}</h5>
                                        <button type="button" className="btn-close" data-bs-dismiss="modal" aria-hidden="true"></button>
                                    </div>
                                    <div className="modal-body p-4">
                                        <form className="needs-validation" name="event-form" id="form-event" noValidate onSubmit={handleSubmit}>

                                            {/* --- Details View --- */}
                                            <div className="event-details" style={{ display: viewMode ? 'block' : 'none' }}>
                                                <div className="d-flex justify-content-end mb-2">
                                                    <button
                                                        type="button"
                                                        className="btn btn-sm px-3"
                                                        onClick={toggleEditMode}
                                                        style={{ backgroundColor: '#f0f2f7', color: '#405189', border: 'none', fontWeight: '500' }}
                                                    >
                                                        Edit
                                                    </button>
                                                </div>

                                                <div className="d-flex align-items-center mb-3">
                                                    <div className="flex-shrink-0 me-3">
                                                        <i className="ri-calendar-event-line text-muted fs-18"></i>
                                                    </div>
                                                    <div className="flex-grow-1">
                                                        <h6 className="d-block fw-semibold mb-0" style={{ color: '#495057' }}>{displayData.date || "No Date Set"}</h6>
                                                    </div>
                                                </div>

                                                <div className="d-flex align-items-center mb-3">
                                                    <div className="flex-shrink-0 me-3">
                                                        <i className="ri-time-line text-muted fs-18"></i>
                                                    </div>
                                                    <div className="flex-grow-1">
                                                        <h6 className="d-block fw-semibold mb-0" style={{ color: '#495057' }}>{displayData.timeStart} - {displayData.timeEnd}</h6>
                                                    </div>
                                                </div>

                                                <div className="d-flex align-items-center mb-4">
                                                    <div className="flex-shrink-0 me-3">
                                                        <i className="ri-map-pin-line text-muted fs-18"></i>
                                                    </div>
                                                    <div className="flex-grow-1">
                                                        <h6 className="d-block fw-semibold mb-0 text-primary-emphasis">{displayData.location}</h6>
                                                    </div>
                                                </div>

                                                <div className="d-flex align-items-center mb-3">
                                                    <div className="flex-shrink-0 me-3">
                                                        <i className="ri-user-star-line text-muted fs-18"></i>
                                                    </div>
                                                    <div className="flex-grow-1">
                                                        <h6 className="d-block fw-semibold mb-0" style={{ color: '#495057' }}>Scheduled By: <span className="text-muted fw-normal">{displayData.scheduledBy || "FCH Admin"}</span></h6>
                                                    </div>
                                                </div>

                                                <div className="d-flex align-items-center mb-4">
                                                    <div className="flex-shrink-0 me-3">
                                                        <i className="ri-user-follow-line text-muted fs-18"></i>
                                                    </div>
                                                    <div className="flex-grow-1">
                                                        <h6 className="d-block fw-semibold mb-0" style={{ color: '#495057' }}>Assigned For: <span className="text-muted fw-normal">{displayData.assignedFor}</span></h6>
                                                    </div>
                                                </div>

                                                <div className="text-end mt-4 pt-2" style={{ display: viewMode ? 'block' : 'none' }}>
                                                    <button
                                                        type="button"
                                                        className="btn px-4 py-2"
                                                        onClick={handleDelete}
                                                        disabled={isDeleting}
                                                        style={{ backgroundColor: '#fff1f0', color: '#ff4d4f', border: 'none', borderRadius: '6px', fontWeight: '500' }}
                                                    >
                                                        {isDeleting ? (
                                                            <><span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span> Deleting...</>
                                                        ) : (
                                                            <><i className="ri-close-line align-bottom me-1" style={{ fontSize: '18px' }}></i> Delete</>
                                                        )}
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Form View */}
                                            <div className="row event-form" style={{ display: !viewMode ? 'flex' : 'none' }}>
                                                <div className="col-12">
                                                    <div className="mb-3">
                                                        <label className="form-label">Appointment Title</label>
                                                        <input className={`form-control ${formErrors.subject ? 'is-invalid' : ''}`} placeholder="Enter Appointment Title" type="text" name="subject" id="event-title" value={formData.subject} onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))} />
                                                        {formErrors.subject && <div className="invalid-feedback d-block" style={{ color: '#f1734f' }}>{formErrors.subject}</div>}
                                                    </div>
                                                </div>

                                                {/* Appointment By Section */}
                                                <div className="col-12">
                                                    <div className="mb-3">
                                                        <label className="form-label">Appointment By</label>
                                                        <div className="d-flex gap-3">
                                                            {isHost && (
                                                                <div className="form-check mb-2">
                                                                    <input className="form-check-input" type="radio" name="assignedForType" id="typePartner" value="partner" checked={assignedForType === 'partner'} onChange={() => { setAssignedForType('partner'); setAssignedForId(''); }} />
                                                                    <label className="form-check-label" htmlFor="typePartner">
                                                                        Partner
                                                                    </label>
                                                                </div>
                                                            )}
                                                            <div className="form-check mb-2">
                                                                <input className="form-check-input" type="radio" name="assignedForType" id="typeEmployee" value="employee" checked={assignedForType === 'employee'} onChange={() => { setAssignedForType('employee'); setAssignedForId(''); }} />
                                                                <label className="form-check-label" htmlFor="typeEmployee">
                                                                    Employee
                                                                </label>
                                                            </div>
                                                            <div className="form-check mb-2">
                                                                <input className="form-check-input" type="radio" name="assignedForType" id="typeBorrower" value="borrower" checked={assignedForType === 'borrower'} onChange={() => { setAssignedForType('borrower'); setAssignedForId(''); }} />
                                                                <label className="form-check-label" htmlFor="typeBorrower">
                                                                    Borrower
                                                                </label>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="col-12">
                                                    <div className="mb-3">
                                                        <label className="form-label">Select {assignedForType ? assignedForType.charAt(0).toUpperCase() + assignedForType.slice(1) : 'Entity'}</label>
                                                        <select className={`form-select ${(formErrors.assigned_for || formErrors.assigned_for_id) ? 'is-invalid' : ''}`} id="event-assigned-for" value={assignedForId} onChange={(e) => setAssignedForId(e.target.value)} disabled={loadingAssignedFor}>
                                                            <option value="" disabled>Select {assignedForType}</option>
                                                            {assignedForType === 'partner' && partners.map(item => (
                                                                <option key={item.id} value={item.id}>{item.full_name || item.name || item.company_name}</option>
                                                            ))}
                                                            {assignedForType === 'employee' && employees.map(item => (
                                                                <option key={item.id} value={item.id}>{item.full_name || (item.first_name + ' ' + item.last_name)}</option>
                                                            ))}
                                                            {assignedForType === 'borrower' && borrowers.map(item => (
                                                                <option key={item.id} value={item.id}>{item.full_name || (item.first_name + ' ' + item.last_name)}</option>
                                                            ))}
                                                        </select>
                                                        {loadingAssignedFor && <div className="text-muted small mt-1">Loading...</div>}
                                                        {(formErrors.assigned_for || formErrors.assigned_for_id) && (
                                                            <div className="invalid-feedback d-block" style={{ color: '#f1734f' }}>
                                                                {formErrors.assigned_for || formErrors.assigned_for_id}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="col-12">
                                                    <div className="mb-3">
                                                        <label className="form-label">Type</label>
                                                        <select className={`form-select ${formErrors.meeting_type ? 'is-invalid' : ''}`} name="category" id="event-category" value={formData.category} onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}>
                                                            <option value="" disabled>Select Type</option>
                                                            {APPOINTMENT_TYPE_OPTIONS.map(opt => (
                                                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                            ))}
                                                        </select>
                                                        {formErrors.meeting_type && <div className="invalid-feedback d-block">{formErrors.meeting_type}</div>}
                                                    </div>
                                                </div>
                                                <div className="col-6">
                                                    <div className="mb-3">
                                                        <label>Event Date</label>
                                                        <div className="input-group">
                                                            <input type="text" id="event-start-date" className={`form-control flatpickr flatpickr-input ${formErrors.appointment_date ? 'is-invalid' : ''}`} placeholder="Select date" readOnly value={formData.date} />
                                                            <span className="input-group-text"><i className="ri-calendar-event-line"></i></span>
                                                        </div>
                                                        {formErrors.appointment_date && <div className="invalid-feedback d-block">{formErrors.appointment_date}</div>}
                                                    </div>
                                                </div>
                                                <div className="col-6" id="event-time">
                                                    <div className="mb-3">
                                                        <label className="form-label">Time Slot</label>
                                                        <select id="time-slot-select" className={`form-select ${formErrors.duration_minutes ? 'is-invalid' : ''}`} onChange={handleTimeSlotChange} value={formData.timeStart}>
                                                            <option value="" disabled>Select a time</option>
                                                            {timeSlots.map((slot) => {
                                                                return <option key={slot.id} value={slot.start_time}>{slot.label}</option>;
                                                            })}
                                                        </select>
                                                        {formErrors.duration_minutes && <div className="invalid-feedback d-block">{formErrors.duration_minutes}</div>}
                                                        <input id="timepicker1" type="text" className="form-control flatpickr flatpickr-input d-none" readOnly value={formData.timeStart} />
                                                        <input id="timepicker2" type="text" className="form-control flatpickr flatpickr-input d-none" readOnly value={formData.timeEnd} />
                                                    </div>
                                                </div>
                                                <div className="col-12">
                                                    <div className="mb-3">
                                                        <label htmlFor="event-location">Time Zone</label>
                                                        <select className={`form-select ${formErrors.timezone ? 'is-invalid' : ''}`} name="event-location" id="event-location" value={formData.location} onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}>
                                                            <option value="" disabled>Select time zone</option>
                                                            {TIMEZONE_OPTIONS.map(opt => (
                                                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                            ))}
                                                        </select>
                                                        {formErrors.timezone && <div className="invalid-feedback d-block">{formErrors.timezone}</div>}
                                                    </div>
                                                </div>
                                                <input type="hidden" id="eventid" name="eventid" value={selectedEventId || ""} />
                                                <div className="col-12">
                                                    <div className="mb-3">
                                                        <label className="form-label">Description</label>
                                                        <textarea className={`form-control ${formErrors.description ? 'is-invalid' : ''}`} id="event-description" placeholder="Enter a description" rows="3" spellCheck="false" value={formData.description} onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}></textarea>
                                                        {formErrors.description && <div className="invalid-feedback d-block">{formErrors.description}</div>}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="hstack gap-2 justify-content-end mt-4" style={{ display: !viewMode ? 'flex' : 'none' }}>
                                                <button type="button" className="btn btn-light" onClick={() => setViewMode(true)}>Cancel</button>
                                                <button type="submit" className="btn btn-success" id="btn-save-event" disabled={isSubmitting}>
                                                    {isSubmitting ? (
                                                        <><span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span> Saving data...</>
                                                    ) : (
                                                        isNewEvent ? "Confirm Appointment" : "Update Appointment"
                                                    )}
                                                </button>
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
