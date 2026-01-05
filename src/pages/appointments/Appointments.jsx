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

// PrimeReact Imports
import { Dropdown } from 'primereact/dropdown';
import { Skeleton } from 'primereact/skeleton';

// Custom Modals
// jQuery & Summernote
import $ from 'jquery';
import 'summernote/dist/summernote-lite.css';
import 'summernote/dist/summernote-lite.js'; // Ensure JS is imported if needed, or rely on window.$

// Attach jQuery to window for Summernote
if (typeof window !== 'undefined') {
    window.jQuery = $;
    window.$ = $;
}


// Toast
import { toast } from 'react-toastify';

// Auth Store
import { useAuthStore } from '../../store/auth/authStore';

// API Services
import { fetchAppointments, fetchAppointmentById, createAppointment, deleteAppointment, updateAppointment, checkAvailability } from '../../modules/appointment/services';
import { fetchPartners } from '../../modules/partner/services';
import { fetchEmployees } from '../../modules/employee/services';
import { fetchAllBorrowers } from '../../modules/borrower/services';

// Config
import { APPOINTMENT_TYPE_OPTIONS, TIMEZONE_OPTIONS, TIME_SLOTS } from '../../config';

export default function Appointments() {
    const calendarRef = useRef(null);
    const eventModalRef = useRef(null);
    const descriptionEditorRef = useRef(null); // Summernote Ref

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

    // Assigned For Selection
    const [assignedForType, setAssignedForType] = useState('employee'); // 'partner', 'employee', 'borrower'
    const [assignedForId, setAssignedForId] = useState('');
    const [partners, setPartners] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [borrowers, setBorrowers] = useState([]);
    const [loadingAssignedFor, setLoadingAssignedFor] = useState(false);

    // Availability Check
    const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
    const [showDateSkeleton, setShowDateSkeleton] = useState(false);
    const [availabilityConflicts, setAvailabilityConflicts] = useState(null);
    const [conflictError, setConflictError] = useState(null); // Temporary conflict alert
    // const [showDeleteModal, setShowDeleteModal] = useState(false); // Removed as per instruction

    // Form Data
    const [formData, setFormData] = useState({
        subject: '',
        category: 'Business Review',
        location: 'UTC (GMT+00:00)', // timezone
        description: '',
        date: '',
        timeStart: '09:00', // Default start time
        timeEnd: '09:30',   // Default end time (30 mins)
        timeSlotId: '', // KEPT for backward compatibility/types, but effectively unused now
    });

    const prevDateRef = useRef(formData.date);

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

    // Fetch Appointments
    useEffect(() => {
        loadAppointments();
    }, []);

    const loadAppointments = async () => {
        try {
            setLoading(true);
            const response = await fetchAppointments();
            if (response.status && response.data) {
                const mappedEvents = response.data.map(apt => {
                    const start = new Date(apt.appointment_date);
                    // Calculate end time based on duration_minutes
                    const end = new Date(start.getTime() + apt.duration_minutes * 60000);

                    // Map variety of colors based on meeting_type for "Accurate Design"
                    const COLOR_MAP = {
                        'Initial Consultation': 'bg-primary-subtle',
                        'Follow-up Meeting': 'bg-info-subtle',
                        'Business Review': 'bg-success-subtle',
                        'Technical Support': 'bg-warning-subtle',
                        'Feedback Session': 'bg-danger-subtle',
                        'Partnership Meeting': 'bg-indigo-subtle',
                        // Keywords mapping for backend flexibility
                        'Marketing': 'bg-success-subtle',
                        'Kickoff': 'bg-secondary-subtle',
                        'Invoice': 'bg-danger-subtle',
                        'Demo': 'bg-info-subtle',
                        'Review': 'bg-warning-subtle',
                        'Offsite': 'bg-dark-subtle'
                    };

                    let className = 'bg-primary-subtle';
                    const type = apt.meeting_type || '';

                    // Match by type or keyword
                    const foundKey = Object.keys(COLOR_MAP).find(key => type.includes(key));
                    if (foundKey) {
                        className = COLOR_MAP[foundKey];
                    } else if (apt.status === 'cancelled') {
                        className = 'bg-danger-subtle';
                    } else if (apt.status === 'completed') {
                        className = 'bg-success-subtle';
                    } else {
                        // Fallback deterministic
                        const SUBTLE_COLORS = ['bg-primary-subtle', 'bg-success-subtle', 'bg-info-subtle', 'bg-warning-subtle', 'bg-danger-subtle'];
                        className = SUBTLE_COLORS[apt.id % SUBTLE_COLORS.length];
                    }

                    return {
                        id: apt.id,
                        title: apt.subject,
                        start: start,
                        end: end,
                        allDay: false,
                        className: className,
                        classNames: [className],
                        description: apt.description,
                        location: apt.timezone,
                        extendedProps: {
                            description: apt.description,
                            location: apt.location,
                            timezone: apt.timezone,
                            appointment_code: apt.appointment_code,
                            status: apt.status,
                            meeting_type: apt.meeting_type,
                            assigned_for: apt.assigned_for
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
        // Only load if not already populated to prevent redundant "why load" behavior
        if (type === 'partner' && partners.length > 0) return;
        if (type === 'employee' && employees.length > 0) return;
        if (type === 'borrower' && borrowers.length > 0) return;

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

    // Check Availability when Date or Assigned Entity changes
    useEffect(() => {
        const check = async (dateWasChanged) => {
            if (!formData.date || !assignedForId) {
                setAvailabilityConflicts(null);
                return;
            }

            try {
                setIsCheckingAvailability(true);
                if (dateWasChanged) setShowDateSkeleton(true);

                setAvailabilityConflicts(null);
                const response = await checkAvailability({
                    assigned_for: assignedForId,
                    appointment_date: formData.date
                });

                if (response.data && response.data.available === false) {
                    setAvailabilityConflicts(response.data);
                }
            } catch (error) {
                console.error("Failed to check availability", error);
            } finally {
                setIsCheckingAvailability(false);
                setShowDateSkeleton(false);
            }
        };

        const dateChanged = prevDateRef.current !== formData.date;
        prevDateRef.current = formData.date;

        const timeoutId = setTimeout(() => {
            if (!viewMode) check(dateChanged);
        }, 500); // 500ms debounce

        return () => clearTimeout(timeoutId);
    }, [formData.date, assignedForId, viewMode]);

    // Fade out conflict error after 5 seconds
    useEffect(() => {
        if (conflictError) {
            const timer = setTimeout(() => {
                setConflictError(null);
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [conflictError]);

    // Initialize Modal
    useEffect(() => {
        if (eventModalRef.current && !modalInstance) {
            const mod = new Modal(eventModalRef.current, { keyboard: false });
            setModalInstance(mod);
        }
    }, []); // Only once








    // Sync error classes to Flatpickr containers
    useEffect(() => {
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

    // Initialize Summernote
    useEffect(() => {
        // Only initialize if we are in "Edit" mode (form visible) and ref exists
        if (!viewMode && descriptionEditorRef.current) {
            const $editor = $(descriptionEditorRef.current);

            $editor.summernote({
                height: 200,
                dialogsInBody: true, // Fix for Bootstrap Modal
                placeholder: 'Enter detailed description...',
                toolbar: [
                    ['style', ['style']],
                    ['font', ['bold', 'underline', 'clear']],
                    ['para', ['ul', 'ol', 'paragraph']],
                    ['insert', ['link']],
                    ['view', ['fullscreen', 'codeview', 'help']]
                ],
                callbacks: {
                    onChange: (contents) => {
                        // Summernote sets value to <p><br></p> when empty, check for that
                        const isEmpty = contents === '<p><br></p>';
                        setFormData(prev => ({ ...prev, description: isEmpty ? '' : contents }));
                    }
                }
            });

            // Set initial content
            $editor.summernote('code', formData.description || '');

            return () => {
                if ($editor.length > 0) {
                    $editor.summernote('destroy');
                }
            };
        }
    }, [viewMode, modalInstance]); // Re-run when viewMode toggles to ensure editor is created/destroyed properly

    // Sync formData description updates back to Summernote if it changes externally (e.g. reset)
    // Be careful not to cause loops. Usually optional if one-way binding is sufficient.


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
        const now = new Date();
        const nextHour = new Date(now.getTime() + 60 * 60000);
        // Round to nearest 15 mins for cleaner UI default? Optional. 
        // For now just hardcode sane defaults or use close approximations.

        setFormData({
            subject: '',
            category: 'Business Review',
            location: 'UTC (GMT+00:00)',
            description: '',
            date: dateStr || new Date().toISOString().split('T')[0],
            timeStart: '09:00',
            timeEnd: '09:30',
            timeSlotId: '',
        });
        setFormErrors({});

        // Robust modal trigger
        if (modalInstance) {
            modalInstance.show();
        } else if (eventModalRef.current) {
            const mod = new Modal(eventModalRef.current, { keyboard: false });
            setModalInstance(mod);
            mod.show();
        }
    };

    const handleEventClick = async (info) => {
        const calEvent = info.event;
        const eventId = calEvent.id;
        setIsNewEvent(false);
        setViewMode(true);
        setSelectedEventId(eventId);
        setFormErrors({});

        // --- 1. SET INITIAL DATA IMMEDIATELY ---
        const startInit = calEvent.start;
        const endInit = calEvent.end || new Date(startInit.getTime() + 30 * 60000);

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

        const h = startInit.getHours().toString().padStart(2, '0');
        const m = startInit.getMinutes().toString().padStart(2, '0');
        const hh_mm = `${h}:${m}`;

        const h_end = endInit.getHours().toString().padStart(2, '0');
        const m_end = endInit.getMinutes().toString().padStart(2, '0');
        const hh_mm_end = `${h_end}:${m_end}`;

        setFormData(prev => ({
            ...prev,
            subject: calEvent.title,
            category: calEvent.classNames[0] || 'Business Review',
            date: startInit.toISOString().split('T')[0],
            timeStart: hh_mm,
            timeEnd: hh_mm_end,
        }));

        if (modalInstance) {
            modalInstance.show();
        } else if (eventModalRef.current) {
            const mod = Modal.getInstance(eventModalRef.current) || new Modal(eventModalRef.current, { keyboard: false });
            setModalInstance(mod);
            mod.show();
        }

        // --- 2. FETCH FULL DETAILS IN BACKGROUND ---
        try {
            const apt = await fetchAppointmentById(eventId);

            // Robust date parsing (replace space with T for ISO compatibility)
            const dateStr = apt.appointment_date ? apt.appointment_date.replace(' ', 'T') : '';
            const start = dateStr ? new Date(dateStr) : new Date();
            const duration = apt.duration_minutes || 30;
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

            const h_full = start.getHours().toString().padStart(2, '0');
            const m_full = start.getMinutes().toString().padStart(2, '0');
            const hh_mm_full = `${h_full}:${m_full}`;

            const h_end_full = end.getHours().toString().padStart(2, '0');
            const m_end_full = end.getMinutes().toString().padStart(2, '0');
            const hh_mm_end_full = `${h_end_full}:${m_end_full}`;

            setFormData({
                subject: apt.subject,
                category: apt.meeting_type || 'Business Review',
                location: apt.timezone || "UTC (GMT+00:00)",
                description: apt.description || "",
                date: start.toISOString().split('T')[0],
                timeStart: hh_mm_full,
                timeEnd: hh_mm_end_full,
                timeSlotId: '', // NO LONGER USED
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

            setAssignedForId(apt.assigned_for?.id || '');

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

        // TODO: Call API to update
    };

    const toggleEditMode = (e) => {
        if (e) e.preventDefault();
        const nextMode = !viewMode;
        setViewMode(nextMode);
    };

    const handleCancel = () => {
        setFormErrors({});
        setConflictError(null);
        if (isNewEvent) {
            if (modalInstance) {
                modalInstance.hide();
            } else if (eventModalRef.current) {
                const mod = Modal.getInstance(eventModalRef.current) || new Modal(eventModalRef.current, { keyboard: false });
                mod.hide();
            }
        } else {
            setViewMode(true);
        }
    };

    // Delete Appointment (Directly without modal as requested)
    const handleDelete = () => {
        confirmDelete();
    };

    const confirmDelete = async () => {
        if (!selectedEventId) return;
        setIsDeleting(true);
        try {
            await deleteAppointment(selectedEventId);
            setEvents(prev => prev.filter(e => String(e.id) !== String(selectedEventId))); // Optimistic update

            // Close Modals
            // setShowDeleteModal(false); // Removed as per instruction
            if (modalInstance) {
                modalInstance.hide();
            } else if (eventModalRef.current) {
                const mod = Modal.getInstance(eventModalRef.current) || new Modal(eventModalRef.current, { keyboard: false });
                mod.hide();
            }

            // Reset
            setSelectedEventId(null); // Clear selected event
            // Assuming resetForm exists and clears formData
            setFormData({
                subject: '',
                category: 'Business Review',
                location: 'UTC (GMT+00:00)',
                description: '',
                date: new Date().toISOString().split('T')[0],
                timeStart: '09:00',
                timeEnd: '09:30',
                timeSlotId: '',
            });
            toast.success("Appointment deleted successfully");
        } catch (error) {
            console.error("Delete failed", error);
            toast.error("Failed to delete appointment");
        } finally {
            setIsDeleting(false);
        }
    };

    const assignedOptions = (() => {
        if (assignedForType === 'partner') return partners.map(p => ({ label: p.full_name || p.name || p.company_name, value: p.id }));
        if (assignedForType === 'employee') return employees.map(e => ({ label: e.full_name || e.first_name + " " + e.last_name, value: e.id }));
        if (assignedForType === 'borrower') return borrowers.map(b => ({ label: b.full_name || b.first_name + " " + b.last_name, value: b.id }));
        return [];
    })();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormErrors({});

        const subject = formData.subject;
        const category = formData.category;
        const dateVal = formData.date;
        const locationVal = formData.location; // Time Zone
        const descVal = formData.description;

        // Construct Start and End Date
        let startDateTime = new Date(`${dateVal}T00:00:00`);
        let durationMinutes = 30; // Default

        if (formData.timeStart) {
            startDateTime = new Date(`${dateVal}T${formData.timeStart}`);
            if (formData.timeEnd) {
                // Handle late night spanning next day? Not complex for now, assume same day.
                // If end time < start time, assume next day?
                // Let's stick to simple same-day logic unless customized.
                let endDateTime = new Date(`${dateVal}T${formData.timeEnd}`);
                if (endDateTime <= startDateTime) {
                    // Maybe user selected past midnight?
                    // or just invalid.
                    // Simple validation:
                }

                durationMinutes = (endDateTime - startDateTime) / 60000;

                if (durationMinutes <= 0) {
                    // Fallback or error?
                    // Let's assume minimum 15 mins
                    durationMinutes = 15;
                }
            }
        } else {
            durationMinutes = 0; // Force validation if no time selected
        }

        // Format date for API: "2026-01-01 14:00:00"
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
            // time_slot_id: REMOVED
        };

        try {
            setIsSubmitting(true);
            if (selectedEventId && !isNewEvent) {
                // Update
                const response = await updateAppointment(selectedEventId, payload);
                toast.success(response.message || 'Appointment updated successfully');
                loadAppointments();
            } else {
                // Create
                const response = await createAppointment(payload);
                toast.success(response.message || 'Appointment created successfully');
                loadAppointments();
            }
            if (modalInstance) {
                modalInstance.hide();
            } else if (eventModalRef.current) {
                const mod = Modal.getInstance(eventModalRef.current) || new Modal(eventModalRef.current, { keyboard: false });
                mod.hide();
            }
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
        <React.Fragment>
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
                                                        badge = <small className="badge bg-primary-subtle text-primary ms-auto">Full day event</small>;
                                                    } else {
                                                        const t1 = tConvert(s.toTimeString().slice(0, 5));
                                                        const t2 = tConvert(e.toTimeString().slice(0, 5));
                                                        badge = <small className="badge bg-light text-primary ms-auto" style={{ border: '1px solid #eef1f6' }}>{t1} to {t2}</small>;
                                                    }
                                                    const colorClass = evt.className ? evt.className.replace('bg-', '').replace('-subtle', '') : 'primary';
                                                    const dotColor = evt.className ? `var(--vz-${colorClass})` : '#405189';

                                                    return (
                                                        <div className="card mb-3" key={evt.id}>
                                                            <div className="card-body">
                                                                <div className="d-flex mb-3">
                                                                    <div className="flex-grow-1">
                                                                        <i className={`mdi mdi-checkbox-blank-circle me-2`} style={{ color: dotColor }}></i>
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
                                                    <style>{`
                                                        #calendar .fc-toolbar-title {
                                                            font-weight: 700 !important;
                                                            color: #495057 !important;
                                                            text-transform: uppercase !important;
                                                            font-size: 1.1rem !important;
                                                            letter-spacing: 0.5px;
                                                        }
                                                        
                                                        /* View Buttons (Month, Week, etc.) */
                                                        .fc .fc-button-group > .fc-button {
                                                            background-color: #eef5ff !important;
                                                            border: none !important;
                                                            color: #2979ff !important;
                                                            font-weight: 600 !important;
                                                            padding: 8px 16px !important;
                                                            font-size: 13px !important;
                                                            transition: all 0.2s ease;
                                                            box-shadow: none !important;
                                                            text-transform: capitalize !important;
                                                        }

                                                        .fc .fc-button-group > .fc-button.fc-button-active {
                                                            background-color: #2979ff !important;
                                                            color: #ffffff !important;
                                                            z-index: 1;
                                                        }

                                                        .fc .fc-button-group > .fc-button:hover {
                                                            background-color: #dbeaff !important;
                                                        }

                                                        /* Navigation Buttons (Prev/Next) */
                                                        .fc .fc-prev-button, .fc .fc-next-button {
                                                            background-color: #eef5ff !important;
                                                            border: none !important;
                                                            color: #2979ff !important;
                                                            font-weight: bold !important;
                                                            border-radius: 4px !important;
                                                            margin: 0 2px !important;
                                                            padding: 4px 8px !important;
                                                        }

                                                        /* Today Button */
                                                        #calendar .fc-today-button {
                                                            background-color: #2979ff !important;
                                                            color: #ffffff !important;
                                                            border: none !important;
                                                            font-weight: 600 !important;
                                                            padding: 6px 14px !important;
                                                            border-radius: 4px !important;
                                                            margin-left: 10px !important;
                                                            opacity: 1 !important;
                                                            text-transform: capitalize !important;
                                                        }

                                                        #calendar .fc-today-button:disabled {
                                                            opacity: 0.65 !important;
                                                        }

                                                        /* Event Styling */
                                                        .fc-event {
                                                            border: none !important;
                                                            border-radius: 4px !important;
                                                            padding: 2px 4px !important;
                                                            margin-top: 1px !important;
                                                            cursor: pointer !important;
                                                        }

                                                        .fc-event-title {
                                                            font-weight: 600 !important;
                                                            font-size: 0.8rem !important;
                                                        }

                                                        /* Color themes for events */
                                                        .bg-success-subtle .fc-event-title, .bg-success-subtle .fc-event-time { color: #0ab39c !important; }
                                                        .bg-primary-subtle .fc-event-title, .bg-primary-subtle .fc-event-time { color: #405189 !important; }
                                                        .bg-info-subtle .fc-event-title, .bg-info-subtle .fc-event-time { color: #29b6f6 !important; }
                                                        .bg-warning-subtle .fc-event-title, .bg-warning-subtle .fc-event-time { color: #f7b84b !important; }
                                                        .bg-danger-subtle .fc-event-title, .bg-danger-subtle .fc-event-time { color: #f06548 !important; }
                                                        .bg-secondary-subtle .fc-event-title, .bg-secondary-subtle .fc-event-time { color: #3577f1 !important; }
                                                        .bg-dark-subtle .fc-event-title, .bg-dark-subtle .fc-event-time { color: #212529 !important; }

                                                        .fc-daygrid-event-dot { display: none !important; }
                                                    `}</style>
                                                    <FullCalendar
                                                        ref={calendarRef}
                                                        plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin, bootstrap5Plugin]}
                                                        initialView={window.innerWidth >= 1200 ? "dayGridMonth" : window.innerWidth >= 768 ? "timeGridWeek" : "listMonth"}
                                                        themeSystem="bootstrap5"
                                                        bootstrapFontAwesome={false}
                                                        buttonIcons={{
                                                            prev: 'chevron-left',
                                                            next: 'chevron-right',
                                                        }}
                                                        headerToolbar={{
                                                            left: 'prev,next today',
                                                            center: 'title',
                                                            right: 'dayGridMonth,timeGridWeek,timeGridDay,listMonth'
                                                        }}
                                                        buttonText={{
                                                            today: 'Today',
                                                            month: 'Month',
                                                            week: 'Week',
                                                            day: 'Day',
                                                            list: 'List'
                                                        }}
                                                        eventTimeFormat={{
                                                            hour: 'numeric',
                                                            minute: '2-digit',
                                                            meridiem: 'short'
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

                            {/* Event Modal */}
                            <div
                                className="modal fade"
                                id="event-modal"
                                tabIndex="-1"
                                ref={eventModalRef} // Attach ref here
                            >
                                <div
                                    className="modal-dialog modal-dialog-centered"
                                    style={{
                                        maxWidth: "650px",
                                        width: "100%",
                                        margin: "1rem auto"
                                    }}
                                >
                                    <div className="modal-content border-0">
                                        <div className="modal-header p-3 bg-info-subtle">
                                            <h5 className="modal-title" id="modal-title">
                                                {viewMode
                                                    ? displayData.title || "Appointment"
                                                    : isNewEvent
                                                        ? "Add Appointment"
                                                        : "Edit Appointment"}
                                            </h5>
                                            <button
                                                type="button"
                                                className="btn-close"
                                                data-bs-dismiss="modal"
                                                aria-hidden="true"
                                            ></button>
                                        </div>

                                        <div className="modal-body p-4">
                                            <form
                                                className="needs-validation"
                                                name="event-form"
                                                id="form-event"
                                                noValidate
                                                onSubmit={handleSubmit}
                                            >
                                                {/* --- Details View --- */}
                                                <div
                                                    className="event-details"
                                                    style={{ display: viewMode ? "block" : "none" }}
                                                >
                                                    <div className="d-flex justify-content-end mb-2">
                                                        <button
                                                            type="button"
                                                            className="btn btn-sm px-3"
                                                            onClick={toggleEditMode}
                                                            style={{
                                                                backgroundColor: "#f0f2f7",
                                                                color: "#405189",
                                                                border: "none",
                                                                fontWeight: "500",
                                                            }}
                                                        >
                                                            Edit
                                                        </button>
                                                    </div>

                                                    <div className="d-flex align-items-center mb-3">
                                                        <div className="flex-shrink-0 me-3">
                                                            <i className="ri-calendar-event-line text-muted fs-18"></i>
                                                        </div>
                                                        <div className="flex-grow-1">
                                                            <h6
                                                                className="d-block fw-semibold mb-0"
                                                                style={{ color: "#495057" }}
                                                            >
                                                                {displayData.date || "No Date Set"}
                                                            </h6>
                                                        </div>
                                                    </div>

                                                    <div className="d-flex align-items-center mb-3">
                                                        <div className="flex-shrink-0 me-3">
                                                            <i className="ri-time-line text-muted fs-18"></i>
                                                        </div>
                                                        <div className="flex-grow-1">
                                                            <h6
                                                                className="d-block fw-semibold mb-0"
                                                                style={{ color: "#495057" }}
                                                            >
                                                                {displayData.timeStart} - {displayData.timeEnd}
                                                            </h6>
                                                        </div>
                                                    </div>

                                                    <div className="d-flex align-items-center mb-4">
                                                        <div className="flex-shrink-0 me-3">
                                                            <i className="ri-map-pin-line text-muted fs-18"></i>
                                                        </div>
                                                        <div className="flex-grow-1">
                                                            <h6
                                                                className="d-block fw-semibold mb-0"
                                                                style={{ color: "#495057" }}
                                                            >
                                                                {displayData.location}
                                                            </h6>
                                                        </div>
                                                    </div>

                                                    <div className="d-flex align-items-center mb-3">
                                                        <div className="flex-shrink-0 me-3">
                                                            <i className="ri-user-star-line text-muted fs-18"></i>
                                                        </div>
                                                        <div className="flex-grow-1">
                                                            <h6
                                                                className="d-block fw-semibold mb-0"
                                                                style={{ color: "#495057" }}
                                                            >
                                                                Scheduled By:{" "}
                                                                <span className="text-muted fw-normal">
                                                                    {displayData.scheduledBy || "FCH Admin"}
                                                                </span>
                                                            </h6>
                                                        </div>
                                                    </div>

                                                    <div className="d-flex align-items-center mb-4">
                                                        <div className="flex-shrink-0 me-3">
                                                            <i className="ri-user-follow-line text-muted fs-18"></i>
                                                        </div>
                                                        <div className="flex-grow-1">
                                                            <h6
                                                                className="d-block fw-semibold mb-0"
                                                                style={{ color: "#495057" }}
                                                            >
                                                                Assigned For:{" "}
                                                                <span className="text-muted fw-normal">
                                                                    {displayData.assignedFor}
                                                                </span>
                                                            </h6>
                                                        </div>
                                                    </div>

                                                    <div
                                                        className="text-end mt-4 pt-2"
                                                        style={{ display: viewMode ? "block" : "none" }}
                                                    >
                                                        <button
                                                            type="button"
                                                            className="btn px-4 py-2"
                                                            onClick={handleDelete}
                                                            disabled={isDeleting}
                                                            style={{
                                                                backgroundColor: "#fff1f0",
                                                                color: "#ff4d4f",
                                                                border: "none",
                                                                borderRadius: "6px",
                                                                fontWeight: "500",
                                                            }}
                                                        >
                                                            {isDeleting ? (
                                                                <>
                                                                    <span
                                                                        className="spinner-border spinner-border-sm me-1"
                                                                        role="status"
                                                                        aria-hidden="true"
                                                                    ></span>{" "}
                                                                    Deleting...
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <i
                                                                        className="ri-close-line align-bottom me-1"
                                                                        style={{ fontSize: "18px" }}
                                                                    ></i>{" "}
                                                                    Delete
                                                                </>
                                                            )}
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* --- Form View --- */}
                                                <div
                                                    className="row event-form"
                                                    style={{ display: !viewMode ? "flex" : "none" }}
                                                >
                                                    {/* Appointment Title */}
                                                    <div className="col-12 mb-3">
                                                        <label className="form-label">Appointment Title <span className="text-danger">*</span></label>
                                                        <input
                                                            type="text"
                                                            className={`form-control ${formErrors.subject ? "is-invalid" : ""
                                                                }`}
                                                            placeholder="Enter Appointment Title"
                                                            name="subject"
                                                            id="event-title"
                                                            value={formData.subject}
                                                            onChange={(e) =>
                                                                setFormData((prev) => ({ ...prev, subject: e.target.value }))
                                                            }
                                                        />
                                                        {formErrors.subject && (
                                                            <div
                                                                className="invalid-feedback d-block"
                                                                style={{ color: "#f1734f" }}
                                                            >
                                                                {formErrors.subject}
                                                            </div>
                                                        )}
                                                    </div>
                                                    {/* Meeting Type */}
                                                    <div className="col-12 mb-3">
                                                        <label className="form-label">Type <span className="text-danger">*</span></label>
                                                        <Dropdown
                                                            id="event-category"
                                                            value={formData.category}
                                                            options={APPOINTMENT_TYPE_OPTIONS}
                                                            onChange={(e) => setFormData((prev) => ({ ...prev, category: e.value }))}
                                                            placeholder="Select Type"
                                                            className={`w-100 ${formErrors.meeting_type ? 'p-invalid' : ''}`}
                                                            appendTo="self"
                                                        />
                                                        {formErrors.meeting_type && (
                                                            <div className="invalid-feedback d-block">
                                                                {formErrors.meeting_type}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Appointment By */}
                                                    <div className="col-12 mb-3">
                                                        <label className="form-label">Appointment By</label>
                                                        <div className="d-flex gap-3">
                                                            {isHost && (
                                                                <div className="form-check mb-2">
                                                                    <input
                                                                        className="form-check-input"
                                                                        type="radio"
                                                                        name="assignedForType"
                                                                        id="typePartner"
                                                                        value="partner"
                                                                        checked={assignedForType === "partner"}
                                                                        onChange={() => {
                                                                            setAssignedForType("partner");
                                                                            setAssignedForId("");
                                                                        }}
                                                                    />
                                                                    <label className="form-check-label" htmlFor="typePartner">
                                                                        Partner
                                                                    </label>
                                                                </div>
                                                            )}
                                                            <div className="form-check mb-2">
                                                                <input
                                                                    className="form-check-input"
                                                                    type="radio"
                                                                    name="assignedForType"
                                                                    id="typeEmployee"
                                                                    value="employee"
                                                                    checked={assignedForType === "employee"}
                                                                    onChange={() => {
                                                                        setAssignedForType("employee");
                                                                        setAssignedForId("");
                                                                    }}
                                                                />
                                                                <label className="form-check-label" htmlFor="typeEmployee">
                                                                    Employee
                                                                </label>
                                                            </div>
                                                            <div className="form-check mb-2">
                                                                <input
                                                                    className="form-check-input"
                                                                    type="radio"
                                                                    name="assignedForType"
                                                                    id="typeBorrower"
                                                                    value="borrower"
                                                                    checked={assignedForType === "borrower"}
                                                                    onChange={() => {
                                                                        setAssignedForType("borrower");
                                                                        setAssignedForId("");
                                                                    }}
                                                                />
                                                                <label className="form-check-label" htmlFor="typeBorrower">
                                                                    Borrower
                                                                </label>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Assigned Entity Select */}
                                                    <div className="col-12 mb-3">
                                                        <label className="form-label">
                                                            Select{" "}
                                                            {assignedForType
                                                                ? assignedForType.charAt(0).toUpperCase() +
                                                                assignedForType.slice(1)
                                                                : "Entity"} <span className="text-danger">*</span>
                                                        </label>
                                                        {loadingAssignedFor ? (
                                                            <Skeleton height="38px" className="mb-2" borderRadius="6px" />
                                                        ) : (
                                                            <Dropdown
                                                                id="event-assigned-for"
                                                                value={assignedForId}
                                                                options={assignedOptions}
                                                                onChange={(e) => setAssignedForId(e.value)}
                                                                optionLabel="label"
                                                                disabled={loadingAssignedFor}
                                                                filter
                                                                showClear
                                                                placeholder={`Select ${assignedForType}...`}
                                                                className={`w-100 ${formErrors.assigned_for || formErrors.assigned_for_id ? 'p-invalid' : ''}`}
                                                                emptyMessage="No results found"
                                                                appendTo="self"
                                                            />
                                                        )}
                                                        {(formErrors.assigned_for || formErrors.assigned_for_id) && (
                                                            <div
                                                                className="invalid-feedback d-block"
                                                                style={{ color: "#f1734f" }}
                                                            >
                                                                {formErrors.assigned_for || formErrors.assigned_for_id}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Event Date */}
                                                    <div className="col-6 mb-3">
                                                        <label className="form-label">Event Date <span className="text-danger">*</span></label>
                                                        <div className="input-group">
                                                            <input
                                                                type="text"
                                                                id="event-start-date"
                                                                className={`form-control flatpickr flatpickr-input ${formErrors.appointment_date ? "is-invalid" : ""
                                                                    }`}
                                                                placeholder="Select date"
                                                                readOnly
                                                                value={formData.date}
                                                            />
                                                            <span className="input-group-text">
                                                                <i className="ri-calendar-event-line"></i>
                                                            </span>
                                                        </div>
                                                        {formErrors.appointment_date && (
                                                            <div className="invalid-feedback d-block">
                                                                {formErrors.appointment_date}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Availability Status */}
                                                    {/* Availability Status - shows Skeleton only when date changes */}
                                                    {showDateSkeleton && (
                                                        <div className="col-12 mb-3">
                                                            <div className="p-3 border border-dashed rounded bg-light">
                                                                <Skeleton className="mb-2" width="100%" height="20px"></Skeleton>
                                                                <Skeleton width="60%" height="20px"></Skeleton>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Time Slot */}
                                                    <div className="col-6 mb-3">
                                                        <label className="form-label">Time Slot <span className="text-danger">*</span></label>
                                                        <div className="d-flex gap-2 align-items-center">
                                                            <div className="flex-grow-1">
                                                                <Dropdown
                                                                    id="time-start-select"
                                                                    value={formData.timeStart}
                                                                    options={TIME_SLOTS}
                                                                    onChange={(e) => {
                                                                        const val = e.value;
                                                                        if (!val) {
                                                                            setFormData(prev => ({ ...prev, timeStart: val }));
                                                                            return;
                                                                        }

                                                                        // Conflict Validation
                                                                        if (availabilityConflicts && (availabilityConflicts.assignee_conflicts || availabilityConflicts.scheduler_conflicts)) {
                                                                            const conflicts = [
                                                                                ...(availabilityConflicts.assignee_conflicts || []),
                                                                                ...(availabilityConflicts.scheduler_conflicts || [])
                                                                            ];

                                                                            const [h, m] = val.split(':').map(Number);
                                                                            const startMinutes = h * 60 + m;
                                                                            const endMinutes = startMinutes + 30;

                                                                            const overlapping = conflicts.filter(c => {
                                                                                const [cH, cM] = c.start_time.split(':').map(Number);
                                                                                const [cEndH, cEndM] = c.end_time.split(':').map(Number);
                                                                                const conflictStart = cH * 60 + cM;
                                                                                const conflictEnd = cEndH * 60 + cEndM;
                                                                                return startMinutes < conflictEnd && endMinutes > conflictStart;
                                                                            });

                                                                            if (overlapping.length > 0) {
                                                                                setConflictError({
                                                                                    count: overlapping.length,
                                                                                    details: overlapping
                                                                                });
                                                                                return; // PREVENT state update
                                                                            }
                                                                        }

                                                                        // If no conflict, update state (Default +30 mins)
                                                                        const [h, m] = val.split(':').map(Number);
                                                                        let endM = m + 30;
                                                                        let endH = h;
                                                                        if (endM >= 60) {
                                                                            endH += 1;
                                                                            endM = 0;
                                                                        }
                                                                        const nextSlotVal = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
                                                                        setFormData(prev => ({ ...prev, timeStart: val, timeEnd: nextSlotVal }));
                                                                    }}
                                                                    placeholder="Start Time"
                                                                    className={`w-100 ${formErrors.duration_minutes ? 'p-invalid' : ''}`}
                                                                    appendTo="self"
                                                                />
                                                            </div>
                                                            <div>to</div>
                                                            <div className="flex-grow-1">
                                                                <Dropdown
                                                                    id="time-end-select"
                                                                    value={formData.timeEnd}
                                                                    options={TIME_SLOTS}
                                                                    onChange={(e) => setFormData(prev => ({ ...prev, timeEnd: e.value }))}
                                                                    placeholder="End Time"
                                                                    className={`w-100 ${formErrors.duration_minutes ? 'p-invalid' : ''}`}
                                                                    appendTo="self"
                                                                />
                                                            </div>
                                                        </div>
                                                        {formErrors.duration_minutes && (
                                                            <div className="invalid-feedback d-block">
                                                                {formErrors.duration_minutes}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Compact Awesome Conflict Alert */}
                                                    <div className="col-12">
                                                        {conflictError && (
                                                            <div className="card border-0 shadow-sm mb-3 animate__animated animate__fadeInUp mx-auto"
                                                                style={{ borderRadius: '12px', borderLeft: '6px solid #f06548', maxWidth: '420px', backgroundColor: '#fffcfc' }}>
                                                                <div className="card-body p-3">
                                                                    <div className="d-flex align-items-center mb-2">
                                                                        <div className="avatar-xs flex-shrink-0 me-2">
                                                                            <div className="avatar-title bg-danger text-white rounded-circle fs-14">
                                                                                <i className="ri-error-warning-fill"></i>
                                                                            </div>
                                                                        </div>
                                                                        <h6 className="text-danger fw-bold mb-0 fs-14">Slot Conflict Detected</h6>
                                                                        <button type="button" className="btn-close ms-auto fs-10" onClick={() => setConflictError(null)}></button>
                                                                    </div>

                                                                    <p className="text-muted mb-2 fs-12 px-1">
                                                                        This slot is already booked. <span className="text-danger fw-medium">Selection blocked.</span>
                                                                    </p>

                                                                    <div className="bg-white rounded-2 p-2 border border-danger-subtle mb-2">
                                                                        {conflictError.details.map((c, idx) => (
                                                                            <div key={idx} className="d-flex align-items-center justify-content-between py-1 border-bottom border-light-subtle last-child-border-0">
                                                                                <div className="d-flex align-items-center overflow-hidden">
                                                                                    <i className="ri-calendar-line text-danger me-1 fs-12"></i>
                                                                                    <span className="fw-semibold text-dark fs-12 text-truncate">{c.subject}</span>
                                                                                </div>
                                                                                <span className="badge bg-danger-subtle text-danger px-2 py-1 fs-11 ms-2">
                                                                                    {tConvert(c.start_time)} - {tConvert(c.end_time)}
                                                                                </span>
                                                                            </div>
                                                                        ))}
                                                                    </div>

                                                                    <div className="d-flex align-items-center justify-content-center pt-1">
                                                                        <div className="text-danger fw-bold fs-11 pulse-text text-uppercase letter-spacing-1">
                                                                            <i className="ri-refresh-line me-1 align-middle"></i> Change Time Slot
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <style>{`
                                                                    .letter-spacing-1 { letter-spacing: 0.5px; }
                                                                    .pulse-text { animation: pulse-text-red 1.2s infinite; }
                                                                    @keyframes pulse-text-red {
                                                                        0% { opacity: 1; }
                                                                        50% { opacity: 0.4; }
                                                                        100% { opacity: 1; }
                                                                    }
                                                                    .last-child-border-0:last-child { border-bottom: 0 !important; }
                                                                `}</style>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Timezone */}
                                                    <div className="col-12 mb-3">
                                                        <label htmlFor="event-location" className="form-label">Time Zone</label>
                                                        <Dropdown
                                                            id="event-location"
                                                            value={formData.location}
                                                            options={TIMEZONE_OPTIONS}
                                                            onChange={(e) => setFormData((prev) => ({ ...prev, location: e.value }))}
                                                            optionLabel="label"
                                                            placeholder="Select time zone"
                                                            className={`w-100 ${formErrors.timezone ? 'p-invalid' : ''}`}
                                                            appendTo="self"
                                                        />
                                                        {formErrors.timezone && (
                                                            <div className="invalid-feedback d-block">
                                                                {formErrors.timezone}
                                                            </div>
                                                        )}
                                                    </div>

                                                    <input
                                                        type="hidden"
                                                        id="eventid"
                                                        name="eventid"
                                                        value={selectedEventId || ""}
                                                    />

                                                    {/* Description */}
                                                    <div className="col-12 mb-3">
                                                        <label className="form-label">Description</label>
                                                        <div ref={descriptionEditorRef}></div>
                                                        {formErrors.description && (
                                                            <div className="invalid-feedback d-block">
                                                                {formErrors.description}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Buttons */}
                                                <div
                                                    className="hstack gap-2 justify-content-end mt-4"
                                                    style={{ display: !viewMode ? "flex" : "none" }}
                                                >
                                                    <button
                                                        type="button"
                                                        className="btn btn-light"
                                                        onClick={handleCancel}
                                                    >
                                                        Cancel
                                                    </button>
                                                    <button
                                                        type="submit"
                                                        className="btn btn-success"
                                                        id="btn-save-event"
                                                        disabled={isSubmitting}
                                                    >
                                                        {isSubmitting ? (
                                                            <>
                                                                <span
                                                                    className="spinner-border spinner-border-sm me-1"
                                                                    role="status"
                                                                    aria-hidden="true"
                                                                ></span>{" "}
                                                                Saving data...
                                                            </>
                                                        ) : isNewEvent ? (
                                                            "Confirm Appointment"
                                                        ) : (
                                                            "Update Appointment"
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



            {/* Delete Confirmation Modal removed as requested */}
        </React.Fragment >
    );
}
