import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import flatpickr from 'flatpickr';
import 'flatpickr/dist/flatpickr.min.css';
import Modal from 'bootstrap/js/dist/modal';
import $ from 'jquery';
import { toast } from 'react-toastify';
import { Dropdown } from 'primereact/dropdown';
import { Skeleton } from 'primereact/skeleton';

// API Services
import { fetchAppointmentById, createAppointment, deleteAppointment, updateAppointment, checkAvailability } from '../../../modules/appointment/services';
import { fetchPartners } from '../../../modules/partner/services';
import { fetchEmployees } from '../../../modules/employee/services';
import { fetchAllBorrowers } from '../../../modules/borrower/services';

// Config
import { APPOINTMENT_TYPE_OPTIONS, TIMEZONE_OPTIONS, TIME_SLOTS } from '../../../config';

const AppointmentModal = forwardRef(({ onSuccess }, ref) => {
    const eventModalRef = useRef(null);
    const descriptionEditorRef = useRef(null);
    const [modalInstance, setModalInstance] = useState(null);
    const [viewMode, setViewMode] = useState(true);
    const [isNewEvent, setIsNewEvent] = useState(false);
    const [selectedEventId, setSelectedEventId] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formErrors, setFormErrors] = useState({});

    const [assignedForType, setAssignedForType] = useState('partner');
    const [partners, setPartners] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [borrowers, setBorrowers] = useState([]);
    const [loadingAssignedFor, setLoadingAssignedFor] = useState(false);

    // Form Data
    const [formData, setFormData] = useState({
        subject: '',
        category: 'Business Review',
        location: 'UTC (GMT+00:00)',
        description: '',
        date: '',
        timeStart: '09:00',
        timeEnd: '09:30',
        entity_id: '',
        entity_type: 'partner',
    });

    // Display Data
    const [displayData, setDisplayData] = useState({
        title: '',
        date: '',
        timeStart: '',
        timeEnd: '',
        location: '',
        description: '',
        scheduledBy: '',
        assignedFor: '',
    });

    const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
    const [showDateSkeleton, setShowDateSkeleton] = useState(false);
    const [availabilityConflicts, setAvailabilityConflicts] = useState(null);
    const [lastConflictingAttempt, setLastConflictingAttempt] = useState(null);
    const [conflictError, setConflictError] = useState(null);
    const [isConflictVisible, setIsConflictVisible] = useState(false);
    const conflictTimeoutRef = useRef(null);
    const isSystemShiftRef = useRef(false);
    const prevDateRef = useRef(formData.date);
    const prevTimeStartRef = useRef(formData.timeStart);
    const prevTimeEndRef = useRef(formData.timeEnd);

    // Initialize Modal
    useEffect(() => {
        if (eventModalRef.current && !modalInstance) {
            const mod = new Modal(eventModalRef.current, { keyboard: false });
            setModalInstance(mod);
        }
    }, []);

    // Check Availability
    useEffect(() => {
        const check = async () => {
            if (!formData.date || !formData.entity_id || viewMode) {
                setAvailabilityConflicts(null);
                setConflictError(null);
                return;
            }

            try {
                // Determine what exactly changed
                const dateOrAssigneeChanged = prevDateRef.current !== formData.date;
                const timeChanged = prevTimeStartRef.current !== formData.timeStart ||
                    prevTimeEndRef.current !== formData.timeEnd;

                // Never show skeleton loader (removed as per user request)

                setAvailabilityConflicts(null);
                const response = await checkAvailability({
                    assigned_for: formData.entity_id,
                    appointment_date: `${formData.date} ${formData.timeStart}:00`
                });

                if (response.data && response.data.available === false) {
                    setAvailabilityConflicts(response.data);

                    const allConflicts = [
                        ...(response.data.assignee_conflicts || []),
                        ...(response.data.scheduler_conflicts || [])
                    ];

                    const matchingConflict = allConflicts.find(c => {
                        const cStart = c.start_time || "";
                        const cEnd = c.end_time || "";
                        // Standard overlap check: (StartA < EndB) && (EndA > StartB)
                        return (formData.timeStart < cEnd && formData.timeEnd > cStart);
                    });

                    // Only show conflict message when TIME SLOT changes (not date)
                    if (matchingConflict && timeChanged && !isSystemShiftRef.current) {
                        setLastConflictingAttempt({
                            attemptedStart: formData.timeStart,
                            attemptedEnd: formData.timeEnd,
                            conflict: matchingConflict
                        });
                        setIsConflictVisible(true);
                    } else if (matchingConflict && !timeChanged && isConflictVisible) {
                        setIsConflictVisible(true);
                    } else if (!matchingConflict && timeChanged && !isSystemShiftRef.current) {
                        setIsConflictVisible(false);
                        setLastConflictingAttempt(null);
                    }
                } else {
                    setAvailabilityConflicts(null);
                    if (timeChanged && !isSystemShiftRef.current) {
                        setLastConflictingAttempt(null);
                        setIsConflictVisible(false);
                    }
                }
            } catch (error) {
                console.error("Failed to check availability", error);
            } finally {
                setIsCheckingAvailability(false);
                isSystemShiftRef.current = false;
                // Update refs after check
                prevDateRef.current = formData.date;
                prevTimeStartRef.current = formData.timeStart;
                prevTimeEndRef.current = formData.timeEnd;
            }
        };

        const timeoutId = setTimeout(() => {
            if (!viewMode) check();
        }, 500);

        return () => clearTimeout(timeoutId);
    }, [formData.date, formData.timeStart, formData.timeEnd, formData.entity_id, viewMode]);

    // Helper functions (tConvert, formatDate, etc.) should be here or imported
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
        return `${d.getDate() < 10 ? '0' + d.getDate() : d.getDate()} ${months[d.getMonth()]}, ${d.getFullYear()}`;
    };

    const isSlotBlocked = (timeValue, isEnd = false) => {
        if (!availabilityConflicts) return false;
        const allConflicts = [
            ...(availabilityConflicts.assignee_conflicts || []),
            ...(availabilityConflicts.scheduler_conflicts || [])
        ];
        return allConflicts.some(c => {
            const cStart = (c.start_time || "").substring(0, 5);
            const cEnd = (c.end_time || "").substring(0, 5);
            if (isEnd) {
                // Block if this end time is inside a conflict
                if (timeValue > cStart && timeValue <= cEnd) return true;
                // Block if this end time "jumps over" the conflict 
                // (i.e. starts after the conflict but our selected start is before it)
                if (formData.timeStart < cStart && timeValue > cStart) return true;
                return false;
            } else {
                // Start time cannot be inside a conflict
                return timeValue >= cStart && timeValue < cEnd;
            }
        });
    };

    // Load Options
    const loadAssignedForOptions = async (type) => {
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
        } finally {
            setLoadingAssignedFor(false);
        }
    };

    useEffect(() => {
        if (!viewMode && assignedForType) {
            loadAssignedForOptions(assignedForType);
        }
    }, [assignedForType, viewMode]);

    // Exposure
    useImperativeHandle(ref, () => ({
        show: async (id) => {
            setIsNewEvent(false);
            setViewMode(true);
            setSelectedEventId(id);
            setFormErrors({});
            setAvailabilityConflicts(null);
            if (modalInstance) modalInstance.show();
            await fetchDetails(id);
        },
        create: (dateStr) => {
            setIsNewEvent(true);
            setViewMode(false);
            setSelectedEventId(null);
            setAssignedForType('partner');
            setAvailabilityConflicts(null);
            setIsConflictVisible(false);
            setLastConflictingAttempt(null);
            setConflictError(null);
            const defaultDate = dateStr || new Date().toISOString().split('T')[0];
            setFormData({
                subject: '',
                category: 'Business Review',
                location: 'UTC (GMT+00:00)',
                description: '',
                date: defaultDate,
                timeStart: '09:00',
                timeEnd: '09:30',
                entity_id: '',
                entity_type: 'partner',
            });
            setFormErrors({});

            // Sync flatpickr if already initialized
            const dateInput = document.getElementById("event-start-date-modal");
            if (dateInput && dateInput._flatpickr) {
                dateInput._flatpickr.setDate(defaultDate);
            }

            if (modalInstance) modalInstance.show();
        }
    }));

    const fetchDetails = async (id) => {
        try {
            const apt = await fetchAppointmentById(id);
            const dateStr = apt.appointment_date ? apt.appointment_date.replace(' ', 'T') : '';
            const start = dateStr ? new Date(dateStr) : new Date();
            const duration = apt.duration_minutes || 30;
            const end = new Date(start.getTime() + duration * 60000);

            setDisplayData({
                title: apt.subject,
                date: formatDate(start),
                timeStart: tConvert(start.toTimeString().slice(0, 5)),
                timeEnd: tConvert(end.toTimeString().slice(0, 5)),
                location: apt.timezone || "Virtual",
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

            // Set Form Data for Editing
            setFormData({
                subject: apt.subject,
                category: apt.meeting_type || 'Business Review',
                location: apt.timezone || "UTC (GMT+00:00)",
                description: apt.description || "",
                date: start.toISOString().split('T')[0],
                timeStart: hh_mm_full,
                timeEnd: hh_mm_end_full,
            });

            if (apt.assigned_for) {
                setAssignedForType(apt.assigned_for.entity_type?.toLowerCase() || 'partner');
                setFormData(p => ({
                    ...p,
                    entity_id: apt.assigned_for.id,
                    entity_type: apt.assigned_for.entity_type?.toLowerCase() || 'partner'
                }));
            }
        } catch (error) {
            console.error("Failed to fetch details", error);
        }
    };

    const handleCancel = () => {
        setFormErrors({});
        setConflictError(null);
        if (isNewEvent) {
            if (modalInstance) modalInstance.hide();
        } else {
            setViewMode(true);
        }
    };

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        setFormErrors({});

        const toMySQLDate = (date) => {
            const pad = (num) => (num < 10 ? '0' + num : num);
            return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
        };

        if (!formData.date) {
            setFormErrors({ appointment_date: "Event date is required" });
            return;
        }

        let startDateTime = new Date(`${formData.date}T${formData.timeStart}`);
        let endDateTime = new Date(`${formData.date}T${formData.timeEnd}`);
        let durationMinutes = (endDateTime - startDateTime) / 60000;

        // Check for conflicts before submission
        if (availabilityConflicts && availabilityConflicts.available === false) {
            const allConflicts = [
                ...(availabilityConflicts.assignee_conflicts || []),
                ...(availabilityConflicts.scheduler_conflicts || [])
            ];
            const matchingConflict = allConflicts.find(c => {
                const cStart = c.start_time || "";
                const cEnd = c.end_time || "";
                return (formData.timeStart < cEnd && formData.timeEnd > cStart);
            });
            if (matchingConflict) {
                toast.error('Cannot save appointment: Time slot conflicts with existing appointment');
                setIsConflictVisible(true);
                return;
            }
        }

        // FIXED PAYLOAD as requested
        const payload = {
            subject: formData.subject,
            description: formData.description,
            appointment_date: toMySQLDate(startDateTime),
            timezone: formData.location,
            duration_minutes: durationMinutes,
            meeting_type: formData.category,
            entity_type: assignedForType,
            entity_id: formData.entity_id ? parseInt(formData.entity_id) : null,
            assigned_for: formData.entity_id ? parseInt(formData.entity_id) : null,
        };

        try {
            setIsSubmitting(true);
            if (selectedEventId && !isNewEvent) {
                await updateAppointment(selectedEventId, payload);
                toast.success('Appointment updated successfully');
            } else {
                await createAppointment(payload);
                toast.success('Appointment created successfully');
            }
            if (modalInstance) modalInstance.hide();
            if (onSuccess) onSuccess();
        } catch (error) {
            if (error.response?.data?.errors) {
                setFormErrors(error.response.data.errors);
            } else {
                toast.error(error.response?.data?.message || 'Failed to save appointment');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const confirmDelete = async () => {
        if (!selectedEventId || !window.confirm("Are you sure you want to delete this appointment?")) return;
        try {
            setIsDeleting(true);
            await deleteAppointment(selectedEventId);
            toast.success("Appointment deleted successfully");
            if (modalInstance) modalInstance.hide();
            if (onSuccess) onSuccess();
        } catch (error) {
            toast.error("Failed to delete appointment");
        } finally {
            setIsDeleting(false);
        }
    };

    // Flatpickr initialization
    useEffect(() => {
        const dateInput = document.getElementById("event-start-date-modal");
        if (dateInput && !viewMode) {
            flatpickr(dateInput, {
                mode: "single",
                minDate: "today",
                defaultDate: formData.date,
                onChange: (selectedDates, dateStr) => {
                    setFormData(prev => ({ ...prev, date: dateStr }));
                }
            });
        }
    }, [viewMode]);

    // Summernote initialization
    useEffect(() => {
        if (!viewMode && descriptionEditorRef.current) {
            const $editor = $(descriptionEditorRef.current);
            $editor.summernote({
                height: 150,
                dialogsInBody: true,
                toolbar: [
                    ['style', ['style']],
                    ['font', ['bold', 'underline', 'clear']],
                    ['para', ['ul', 'ol', 'paragraph']],
                    ['insert', ['link']],
                    ['view', ['codeview']]
                ],
                callbacks: {
                    onChange: (contents) => {
                        const isEmpty = contents === '<p><br></p>';
                        setFormData(prev => ({ ...prev, description: isEmpty ? '' : contents }));
                    }
                }
            });
            $editor.summernote('code', formData.description || '');
            return () => $editor.summernote('destroy');
        }
    }, [viewMode]);

    const assignedOptions = (() => {
        if (assignedForType === 'partner') return partners.map(p => ({ label: p.full_name || p.name || p.company_name, value: p.id }));
        if (assignedForType === 'employee') return employees.map(e => ({ label: e.full_name || e.first_name + " " + e.last_name, value: e.id }));
        if (assignedForType === 'borrower') return borrowers.map(b => ({ label: b.full_name || b.first_name + " " + b.last_name, value: b.id }));
        return [];
    })();

    return (
        <div className="modal fade" id="appointmentModal" ref={eventModalRef} tabIndex="-1" aria-hidden="true">
            <div className="modal-dialog modal-dialog-centered modal-lg">
                <div className="modal-content border-0 shadow-lg">
                    <div className="modal-header p-3 bg-info-subtle">
                        <h5 className="modal-title">
                            {viewMode ? "Appointment Details" : (isNewEvent ? "Add Appointment" : "Edit Appointment")}
                        </h5>
                        <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>

                    <div className="modal-body p-4" style={{ backgroundColor: '#fdfdfd' }}>
                        {/* Details View */}
                        {viewMode ? (
                            <div className="event-details position-relative">
                                <div className="d-flex justify-content-end mb-3" style={{ position: 'absolute', right: 0, top: '-5px' }}>
                                    <button className="btn btn-sm btn-outline-primary border-primary-subtle bg-white" onClick={() => setViewMode(false)}>
                                        <i className="ri-edit-line me-1"></i> Edit
                                    </button>
                                </div>
                                <div className="mb-4">
                                    <h4 className="fw-bold mb-1 text-dark">{displayData.title}</h4>
                                    <span className="badge bg-success-subtle text-success border border-success-subtle px-2">
                                        <i className="ri-checkbox-circle-line me-1"></i> Confirmed
                                    </span>
                                </div>

                                <div className="row g-4">
                                    <DetailItem icon="ri-calendar-event-line" label="Date" value={displayData.date} />
                                    <DetailItem icon="ri-time-line" label="Time Slot" value={`${displayData.timeStart} - ${displayData.timeEnd}`} />
                                    <DetailItem icon="ri-map-pin-line" label="Time Zone" value={displayData.location} />
                                    <DetailItem icon="ri-user-line" label="Scheduled By" value={displayData.scheduledBy} />
                                    <DetailItem icon="ri-user-follow-line" label="Assigned For" value={displayData.assignedFor} />

                                    <div className="col-12 mt-3 pt-3 border-top">
                                        <label className="text-muted fs-11 text-uppercase fw-bold mb-2 d-block letter-spacing-1">Description</label>
                                        <div className="text-muted fs-14 border rounded p-3 bg-light-subtle" dangerouslySetInnerHTML={{ __html: displayData.description }}></div>
                                    </div>
                                </div>

                                <div className="mt-4 pt-3 border-top d-flex justify-content-between">
                                    <button className="btn btn-soft-danger fw-medium" onClick={confirmDelete} disabled={isDeleting}>
                                        <i className="ri-delete-bin-line me-1"></i> {isDeleting ? "Deleting..." : "Delete Appointment"}
                                    </button>
                                    <button className="btn btn-light" data-bs-dismiss="modal">Close</button>
                                </div>
                            </div>
                        ) : (
                            /* Form View */
                            <form onSubmit={handleSubmit}>
                                <div className="row">

                                    <div className="col-12 mb-3">
                                        <label className="form-label">Appointment Title <span className="text-danger">*</span></label>
                                        <input type="text" className={`form-control ${formErrors.subject ? "is-invalid" : ""}`}
                                            value={formData.subject} onChange={(e) => setFormData(p => ({ ...p, subject: e.target.value }))} placeholder="Enter appointment title" />
                                        {formErrors.subject && <div className="invalid-feedback">{formErrors.subject}</div>}
                                    </div>

                                    <div className="col-12 mb-3">
                                        <label className="form-label">Type <span className="text-danger">*</span></label>
                                        <Dropdown value={formData.category} options={APPOINTMENT_TYPE_OPTIONS}
                                            onChange={(e) => setFormData(p => ({ ...p, category: e.value }))}
                                            className={`w-100 ${formErrors.meeting_type ? 'p-invalid' : ''}`}
                                            placeholder="Select Type" appendTo="self" />
                                    </div>

                                    <div className="col-12 mb-3">
                                        <label className="form-label">Assigned For <span className="text-danger">*</span></label>
                                        <div className="d-flex flex-wrap gap-3 mb-2 mt-1">
                                            {['partner', 'employee', 'borrower'].map(t => (
                                                <div className="form-check" key={t}>
                                                    <input className="form-check-input" type="radio"
                                                        name="assignedForType" id={`type-${t}`}
                                                        checked={assignedForType === t}
                                                        onChange={() => {
                                                            setAssignedForType(t);
                                                            setFormData(p => ({ ...p, entity_id: '', entity_type: t }));
                                                        }} />
                                                    <label className="form-check-label ps-1" htmlFor={`type-${t}`}>
                                                        {t.charAt(0).toUpperCase() + t.slice(1)}
                                                    </label>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="position-relative" style={{ minHeight: '38px' }}>
                                            {loadingAssignedFor && (
                                                <div className="position-absolute w-100 h-100 bg-white d-flex align-items-center px-1"
                                                    style={{ zIndex: 2, top: 0, left: 0, pointerEvents: 'none', opacity: 0.9 }}>
                                                    <Skeleton width="100%" height="38px" borderRadius="6px" />
                                                </div>
                                            )}
                                            <Dropdown value={formData.entity_id} options={assignedOptions}
                                                onChange={(e) => {
                                                    setFormData(p => ({ ...p, entity_id: e.value }));
                                                }}
                                                loading={loadingAssignedFor} filter
                                                placeholder={`Select ${assignedForType.charAt(0).toUpperCase() + assignedForType.slice(1)}`}
                                                className={`w-100 ${formErrors.assigned_for ? 'p-invalid' : ''}`}
                                                appendTo="self" />
                                        </div>
                                    </div>

                                    <div className="col-12 position-relative px-0 mb-2" style={{ minHeight: '38px' }}>
                                        {isCheckingAvailability && (
                                            <div className="position-absolute w-100 h-100 bg-white d-flex align-items-center gap-3 px-3"
                                                style={{ zIndex: 10, top: 0, left: 0, pointerEvents: 'none', opacity: 0.9 }}>
                                                <div className="flex-grow-1">
                                                    <Skeleton width="100%" height="45px" borderRadius="6px" />
                                                </div>
                                                <div className="flex-grow-1">
                                                    <Skeleton width="100%" height="45px" borderRadius="6px" />
                                                </div>
                                            </div>
                                        )}
                                        <div className="row mx-0">
                                            <div className="col-6 mb-0 px-2">
                                                <label className="form-label fs-13 fw-semibold">Event Date <span className="text-danger">*</span></label>
                                                <div className="input-group">
                                                    <span className="input-group-text bg-light border-end-0"><i className="ri-calendar-line text-muted"></i></span>
                                                    <input type="text" id="event-start-date-modal" className={`form-control border-start-0 ${formErrors.appointment_date ? 'is-invalid border-danger' : ''}`}
                                                        value={formData.date} readOnly placeholder="Select date" />
                                                    {formErrors.appointment_date && <div className="invalid-feedback d-block mt-1" style={{ position: 'absolute', bottom: '-22px', left: '0', fontSize: '10px' }}>{formErrors.appointment_date}</div>}
                                                </div>
                                            </div>
                                            <div className="col-6 mb-0 px-2">
                                                <label className="form-label fs-13 fw-semibold">Time Slot <span className="text-danger">*</span></label>
                                                <div className="d-flex align-items-center gap-2">
                                                    <Dropdown value={formData.timeStart} options={TIME_SLOTS}
                                                        onChange={(e) => {
                                                            const startVal = e.value;
                                                            setFormData(p => {
                                                                const newData = { ...p, timeStart: startVal };
                                                                if (newData.timeEnd <= startVal) {
                                                                    const [h, m] = startVal.split(':').map(Number);
                                                                    let endM = m + 30; let endH = h;
                                                                    if (endM >= 60) { endH += 1; endM = 0; }
                                                                    if (endH < 24) {
                                                                        newData.timeEnd = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
                                                                    }
                                                                }
                                                                return newData;
                                                            });
                                                        }}

                                                        className="flex-grow-1" placeholder="Start" appendTo="self" />
                                                    <span className="text-muted fw-bold">to</span>
                                                    <Dropdown value={formData.timeEnd} options={TIME_SLOTS}
                                                        onChange={(e) => {
                                                            setFormData(p => ({ ...p, timeEnd: e.value }));
                                                        }}

                                                        className="flex-grow-1" placeholder="End" appendTo="self" />
                                                </div>
                                                {/* Conflict Danger Message */}
                                                {isConflictVisible && availabilityConflicts && (
                                                    <div className="text-danger fs-11 mt-1">

                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Availability Alert - Animated Collapse */}
                                    <div className="col-12 px-2 overflow-hidden"
                                        style={{ transition: 'all 0.4s ease', maxHeight: isConflictVisible && (availabilityConflicts || lastConflictingAttempt) ? '200px' : '0', opacity: isConflictVisible ? 1 : 0, marginBottom: isConflictVisible && (availabilityConflicts || lastConflictingAttempt) ? '1rem' : '0' }}>
                                        {(availabilityConflicts || lastConflictingAttempt) && (
                                            <div className="alert alert-danger-subtle border border-danger-subtle d-flex align-items-center mb-0 py-2 conflict-alert position-relative" role="alert">
                                                <i className="ri-error-warning-fill me-2 fs-18 text-danger"></i>
                                                <div className="flex-grow-1 pe-4">
                                                    <div className="d-flex justify-content-between align-items-center">
                                                        <strong className="text-danger fs-13 text-uppercase">Scheduling Conflict</strong>
                                                        <span className="badge bg-danger text-white fs-10 px-2 py-1">CONFLICTED</span>
                                                    </div>
                                                    <span className="fs-12 text-muted d-block mt-1">
                                                        {(() => {
                                                            const attempt = lastConflictingAttempt;
                                                            if (attempt) {
                                                                const { attemptedStart, attemptedEnd, conflict } = attempt;
                                                                return (
                                                                    <>
                                                                        Your selected <span className="fw-bold">{tConvert(attemptedStart)} - {tConvert(attemptedEnd)}</span> conflicts with an existing appointment on <span className="fw-bold">{conflict.date}</span> from <span className="fw-bold">{tConvert(conflict.start_time)} to {tConvert(conflict.end_time)}</span>.
                                                                    </>
                                                                );
                                                            }

                                                            const allConflicts = [
                                                                ...(availabilityConflicts?.assignee_conflicts || []),
                                                                ...(availabilityConflicts?.scheduler_conflicts || [])
                                                            ];

                                                            // Try to find the specific conflict that matches the selected time range
                                                            const matchingConflict = allConflicts.find(c => {
                                                                const cStart = c.start_time || "";
                                                                const cEnd = c.end_time || "";
                                                                return (formData.timeStart < cEnd && formData.timeEnd > cStart);
                                                            }) || allConflicts[0];

                                                            if (matchingConflict) {
                                                                const cDate = matchingConflict.date || "";
                                                                const cStart = matchingConflict.start_time || "";
                                                                const cEnd = matchingConflict.end_time || "";
                                                                return (
                                                                    <>
                                                                        Already scheduled for {cDate} from {tConvert(cStart)} to {tConvert(cEnd)}.
                                                                    </>
                                                                );
                                                            }
                                                            return "Conflicting appointment found on this date.";
                                                        })()}
                                                    </span>
                                                </div>
                                                <button type="button" className="btn-close fs-10 position-absolute"
                                                    style={{ right: '8px', top: '8px' }}
                                                    onClick={() => setIsConflictVisible(false)} aria-label="Close"></button>
                                            </div>
                                        )}
                                    </div>

                                    <div className="col-12 mb-3">
                                        <label className="form-label fs-13 fw-semibold">Time Zone</label>
                                        <Dropdown value={formData.location} options={TIMEZONE_OPTIONS}
                                            onChange={(e) => setFormData(p => ({ ...p, location: e.value }))}
                                            className="w-100" filter placeholder="Select Time Zone" appendTo="self" />
                                    </div>

                                    <div className="col-12 mb-3">
                                        <label className="form-label fs-13 fw-semibold">Description</label>
                                        <div ref={descriptionEditorRef}></div>
                                    </div>
                                </div>

                                <div className="hstack gap-2 justify-content-end mt-4 pt-3 border-top">
                                    <button type="button" className="btn btn-light" onClick={handleCancel}>Cancel</button>
                                    <button type="submit" className="btn btn-primary" disabled={isSubmitting || (availabilityConflicts && availabilityConflicts.available === false)}>
                                        <i className={`${isNewEvent ? 'ri-add-line' : 'ri-save-line'} me-1 align-middle`}></i>
                                        {isSubmitting ? "Saving..." : (isNewEvent ? "Confirm Appointment" : "Save Changes")}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            </div>
            <style>{`
                .letter-spacing-1 { letter-spacing: 0.5px; }
                .uppercase-label { text-transform: uppercase; font-weight: 700; }
                .btn-soft-danger { background-color: rgba(240, 101, 72, .1); color: #f06548; border: none; }
                .btn-soft-danger:hover { background-color: #f06548; color: #fff; }
                .alert-danger-subtle { background-color: #fef4f2; border-color: #fbd9d0; color: #f06548; }
                .conflict-alert { animation: slideInAlert 0.3s ease-out; }
                @keyframes slideInAlert {
                    from { opacity: 0; transform: translateY(-5px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
});

const DetailItem = ({ icon, label, value }) => (
    <div className="col-md-6">
        <div className="d-flex align-items-center">
            <div className="flex-shrink-0 me-3">
                <div className="avatar-xs">
                    <div className="avatar-title rounded-circle bg-light text-primary">
                        <i className={`${icon} fs-16`}></i>
                    </div>
                </div>
            </div>
            <div className="flex-grow-1">
                <p className="text-muted mb-0 fs-12 uppercase-label">{label}</p>
                <h6 className="mb-0 fs-14 fw-medium">{value}</h6>
            </div>
        </div>
    </div>
);

export default AppointmentModal;
