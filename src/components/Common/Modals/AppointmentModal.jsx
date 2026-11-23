import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import { Calendar } from 'primereact/calendar';
import { parseDate } from '../../../utils/formatters';

import Modal from 'bootstrap/js/dist/modal';
import $ from 'jquery';
import { toast } from 'react-toastify';
import { Dropdown } from 'primereact/dropdown';
import { Skeleton } from 'primereact/skeleton';

// API Services
import { fetchAppointmentById, createAppointment, deleteAppointment, updateAppointment, checkAvailability, fetchSelectableUsers } from '../../../modules/appointment/services';
import { useAuthStore } from '../../../store/auth/authStore';
import { usePermissions } from '../../../lib/auth/usePermissions';
import { useSummernote } from '../../../hooks/useSummernote';
import DeleteConfirmationModal from './DeleteConfirmationModal';
import ConfirmationModal from './ConfirmationModal';

// Config
import { APPOINTMENT_STATUS, APPOINTMENT_TYPE_OPTIONS, TIME_SLOTS } from '../../../config';
import { browserTimeZone, defaultStart, endSlotsAfter, endWithinDay, localDateString, minutesBetween, startSlotsFrom, timeAfter, timeZoneLabel } from '../../../utils/appointmentTime';

// Styles
import "../../../../assets/css/appointment-modal.css";
import { sanitizeHtml } from '../../../utils/sanitizeHtml';
import AttendeePicker from '../../Appointment/AttendeePicker';
import CalendlyBookingFields, { EMPTY_CALENDLY_BOOKING } from '../../Appointment/CalendlyBookingFields';
import AddToCalendly from '../../Appointment/AddToCalendly';

// The API fields the form shows a refusal beside; any other shows under the time slot (R2 BUG-024).
const FORM_ERROR_FIELDS = ['subject', 'meeting_type', 'assigned_for', 'appointment_date', 'duration_minutes', 'timezone', 'attendees', 'sync_with_calendly', 'calendly_event_type_uri', 'calendly_location', 'calendly_use_title'];
// Each attendee's refusal shows beside that person (attendees.0.email ...).
const isShownErrorField = (field) => FORM_ERROR_FIELDS.includes(field) || field.startsWith('attendees.');

/** The API's attendee rows as the form sends them back (Calendly v2). */
const toAttendeeInputs = (attendees = []) =>
    attendees.map(a => (a.user_id ? { user_id: a.user_id, ...(a.name ? { name: a.name } : {}) } : { email: a.email, ...(a.name ? { name: a.name } : {}) }));

const AppointmentModal = forwardRef(({ onSuccess }, ref) => {
    const eventModalRef = useRef(null);
    const descriptionEditorRef = useRef(null); // This ref will be passed to the useSummernote hook

    const [modalInstance, setModalInstance] = useState(null);
    const [viewMode, setViewMode] = useState(true);
    const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
    const [isNewEvent, setIsNewEvent] = useState(false);
    const [selectedEventId, setSelectedEventId] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showCancelConfirm, setShowCancelConfirm] = useState(false);
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
    // True while the cancel question is open; closing it without cancelling
    // returns to the details (Bootstrap also reports the close afterwards).
    const askingCancelRef = useRef(false);
    const [formErrors, setFormErrors] = useState({});

    // Under the time slot: the duration's refusal, else one on a field the form has no place for (R2 BUG-024).
    const unshownErrorField = Object.keys(formErrors).find(field => !isShownErrorField(field));
    const timeSlotError = formErrors.duration_minutes || (unshownErrorField ? [].concat(formErrors[unshownErrorField])[0] : null);

    const currentUser = useAuthStore((state) => state.user);
    const { hasPermission } = usePermissions();
    const isHost = currentUser?.is_host == 1;
    const hostEntityId = currentUser?.entity_id;

    const [assignedForType, setAssignedForType] = useState('');
    const [selectableUsers, setSelectableUsers] = useState([]);
    const [loadingAssignedFor, setLoadingAssignedFor] = useState(false);
    const [isMeetingWithChecked, setIsMeetingWithChecked] = useState(false);

    // Form Data
    const [formData, setFormData] = useState({
        subject: '',
        category: 'Business Review',
        // Booked in the browser's zone; the API stores UTC (BUG-080).
        location: browserTimeZone(),
        description: '',
        date: '',
        timeStart: '09:00',
        timeEnd: '09:30',
        entity_id: '',
        assigned_for: '',
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
        scheduledById: '',
        scheduledBy: '',
        assignedFor: '',
        appointmentCode: '',
        category: '',
        assignedForUserId: '',
        status: '',
        isPast: false,
        // Calendly v2: everyone on it, and whether Calendly holds it.
        attendees: [],
        isCalendly: false,
        hadConflict: false,
        joinUrl: null,
        rescheduleUrl: null,
    });

    // Calendly v2: who it is with (users or outside emails), their clashes
    // (a warning), and "Sync with Calendly".
    const [attendees, setAttendees] = useState([]);
    const [attendeeConflicts, setAttendeeConflicts] = useState([]);
    const [calendlyBooking, setCalendlyBooking] = useState(EMPTY_CALENDLY_BOOKING);
    // Calendly v2: the event type's length and whether the start is an open time there (CalendlyBookingFields says).
    const [calendlyFit, setCalendlyFit] = useState({ minutes: null, open: null });

    // While it is synced to Calendly, the end follows the event type's length - Calendly books that long.
    useEffect(() => {
        if (!calendlyFit.minutes || !formData.timeStart) return;
        const end = timeAfter(formData.timeStart, calendlyFit.minutes);
        if (end !== formData.timeEnd) setFormData(p => ({ ...p, timeEnd: end }));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [calendlyFit.minutes, formData.timeStart]);
    // A new answer about the people clears the API's refusal about them.
    useEffect(() => {
        setFormErrors(p => {
            const kept = Object.fromEntries(Object.entries(p).filter(([field]) => !field.startsWith('attendees')));
            return Object.keys(kept).length === Object.keys(p).length ? p : kept;
        });
    }, [attendees]);

    // The two people on a meeting may change it (BUG-102): whoever booked it
    // edits or deletes it; whoever it was booked with reschedules, confirms or
    // cancels it.
    const canUpdate = hasPermission('update appointments');
    const isScheduler = currentUser?.id == displayData.scheduledById;
    const isInvitee = !isScheduler && (
        (!!displayData.assignedForUserId && currentUser?.id == displayData.assignedForUserId)
        || displayData.attendees.some(a => a.user_id && a.user_id == currentUser?.id)
    );
    // Calendly owns a Calendly meeting's time and people: they are changed there.
    const editingCalendlyMeeting = !isNewEvent && displayData.isCalendly;
    const isOpenStatus = displayData.status === APPOINTMENT_STATUS.PENDING || displayData.status === APPOINTMENT_STATUS.CONFIRMED;
    const canConfirm = isInvitee && canUpdate && !displayData.isPast && displayData.status === APPOINTMENT_STATUS.PENDING;
    const canCancel = isInvitee && canUpdate && !displayData.isPast && isOpenStatus;

    const [originalData, setOriginalData] = useState(null);

    // Start times still ahead on the chosen day (BUG-078); an appointment being
    // edited keeps its own time in the list.
    const openStarts = startSlotsFrom(TIME_SLOTS, formData.date);
    const ownStart = !isNewEvent && originalData?.date === formData.date ? originalData?.timeStart : null;
    const startOptions = ownStart && !openStarts.some(slot => slot.value === ownStart)
        ? TIME_SLOTS.filter(slot => slot.value === ownStart || openStarts.includes(slot))
        : openStarts;

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
            if (!formData.date || attendees.length === 0 || viewMode) {
                setAvailabilityConflicts(null);
                setAttendeeConflicts([]);
                setConflictError(null);
                return;
            }

            try {
                // User Request: Only show skeleton when time slot changes
                const timeChanged = prevTimeStartRef.current !== formData.timeStart ||
                    prevTimeEndRef.current !== formData.timeEnd;
                const isFirstCheck = !prevDateRef.current;

                if (timeChanged && !isFirstCheck) {
                    setIsCheckingAvailability(true);
                }

                setAvailabilityConflicts(null);
                const response = await checkAvailability(availabilityRequest());

                // Each attendee's clash is a warning beside them; only the creator's stops it.
                setAttendeeConflicts(response.data?.attendee_conflicts || []);
                const creatorConflicts = response.data?.creator_conflicts || [];

                if (creatorConflicts.length > 0) {
                    setAvailabilityConflicts(response.data);

                    const allConflicts = [...creatorConflicts];

                    const matchingConflict = allConflicts.find(c => {
                        const cStart = c.start_time || "";
                        const cEnd = c.end_time || "";
                        // Standard overlap check: (StartA < EndB) && (EndA > StartB)
                        // AND exclude the CURRENT appointment itself by ID
                        const isSelf = !isNewEvent && String(c.id) === String(selectedEventId);
                        return (formData.timeStart < cEnd && endWithinDay(formData.timeStart, formData.timeEnd) > cStart) && !isSelf;
                    });

                    // Logic: If we are EDITING and the user has NOT changed the time/date, ignore conflicts (it's likely the current appointment)
                    const hasChanged = isNewEvent ||
                        formData.date !== originalData?.date ||
                        formData.timeStart !== originalData?.timeStart ||
                        formData.timeEnd !== originalData?.timeEnd;

                    if (matchingConflict) {
                        setLastConflictingAttempt({
                            attemptedStart: formData.timeStart,
                            attemptedEnd: formData.timeEnd,
                            conflict: matchingConflict
                        });
                        setIsConflictVisible(true);
                    } else {
                        setIsConflictVisible(false);
                        setLastConflictingAttempt(null);
                    }
                } else {
                    setAvailabilityConflicts(null);
                    setLastConflictingAttempt(null);
                    setIsConflictVisible(false);
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
    }, [formData.date, formData.timeStart, formData.timeEnd, JSON.stringify(attendees), viewMode, originalData]);

    /** Calendly v2: the people and the exact time, so the answer splits the creator's clash from each attendee's. */
    const availabilityRequest = () => ({
        attendees,
        appointment_date: `${formData.date} ${formData.timeStart}:00`,
        duration_minutes: minutesBetween(formData.timeStart, formData.timeEnd),
        timezone: formData.location,
        ...(isNewEvent ? {} : { exclude_appointment_id: selectedEventId }),
    });

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

    const getShortType = (fullType) => {
        if (!fullType) return 'partners';
        const segments = fullType.split('\\\\');
        const last = segments[segments.length - 1].toLowerCase();
        if (last === 'employee') return 'employee-details';
        if (last === 'partner') return 'partners';
        if (last === 'borrower') return 'clients';
        return last + 's';
    };

    const isSlotBlocked = (timeValue, isEnd = false) => {
        if (!availabilityConflicts) return false;
        // Only the creator's own clashes block a time (Calendly v2).
        const allConflicts = [...(availabilityConflicts.creator_conflicts || [])];
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
    const loadSelectableUsers = async () => {
        try {
            setLoadingAssignedFor(true);
            const payload = {
                [isHost ? 'meeting_with' : 'meeting_with_host']: isMeetingWithChecked ? 1 : 0
            };
            const response = await fetchSelectableUsers(payload);
            if (response.status) {
                setSelectableUsers(response.data || []);
            }
        } catch (error) {
            console.error("Failed to load selectable users", error);
        } finally {
            setLoadingAssignedFor(false);
        }
    };

    useEffect(() => {
        if (!viewMode) {
            loadSelectableUsers();
        }
    }, [viewMode, isMeetingWithChecked]);

    // Exposure
    useImperativeHandle(ref, () => ({
        show: async (id) => {
            setIsNewEvent(false);
            setViewMode(true);
            setIsDescriptionExpanded(false);
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
            setAssignedForType('');
            setAvailabilityConflicts(null);
            setIsConflictVisible(false);
            setLastConflictingAttempt(null);
            setConflictError(null);
            setIsMeetingWithChecked(false);
            setAttendees([]);
            setAttendeeConflicts([]);
            setCalendlyBooking(EMPTY_CALENDLY_BOOKING);
            setDisplayData(p => ({ ...p, attendees: [], isCalendly: false, joinUrl: null, rescheduleUrl: null, scheduledById: '', assignedForUserId: '' }));
            // The browser's own day, at 09:00 or the next time still ahead (BUG-078).
            const start = defaultStart(TIME_SLOTS, dateStr || localDateString());
            setFormData({
                subject: '',
                category: 'Business Review',
                location: browserTimeZone(),
                description: '',
                date: start.date,
                timeStart: start.time,
                timeEnd: timeAfter(start.time),
                entity_id: '',
                assigned_for: '',
                entity_type: '',
            });
            setFormErrors({});



            if (modalInstance) modalInstance.show();
        }
    }));

    const fetchDetails = async (id) => {
        try {
            setLoadingDetails(true);
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
                // The API sends the time in this browser's zone.
                location: timeZoneLabel(browserTimeZone()),
                description: apt.description || "No Description",
                scheduledById: apt.scheduled_by?.id,
                scheduledBy: apt.scheduled_by?.name || "FCH Admin",
                assignedFor: apt.assigned_for?.name || "N/A",
                assignedForId: apt.assigned_for?.entity_id || apt.assigned_for?.id,
                assignedForType: apt.assigned_for?.entity_type || null,
                assignedForAvatar: apt.assigned_for?.image || apt.assigned_for?.avatar || apt.assigned_for?.profile_picture || null,
                appointmentCode: apt.appointment_code || '',
                category: apt.meeting_type || 'Business Review',
                assignedForUserId: apt.assigned_for?.id,
                status: apt.status || '',
                isPast: start < new Date(),
                attendees: apt.attendees || [],
                isCalendly: Boolean(apt.is_calendly),
                hadConflict: Boolean(apt.had_conflict),
                joinUrl: apt.join_url || null,
                rescheduleUrl: apt.reschedule_url || null,
            });
            setAttendees(apt.attendees?.length
                ? toAttendeeInputs(apt.attendees)
                : (apt.assigned_for?.id ? [{ user_id: apt.assigned_for.id, name: apt.assigned_for.name }] : []));
            setAttendeeConflicts([]);
            setCalendlyBooking(EMPTY_CALENDLY_BOOKING);

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
                location: browserTimeZone(),
                description: apt.description || "",
                date: localDateString(start),
                timeStart: hh_mm_full,
                timeEnd: hh_mm_end_full,
                entity_id: '',
                assigned_for: '',
                entity_type: ''
            });

            // The checkbox follows who the meeting is with. Ticked, the
            // picker lists partner accounts: other partners for the host
            // ("Meeting with partner"), the host for a partner ("Meeting with
            // host"); unticked, the caller's own team and clients. A partner's
            // meeting with its client was ticked, so the picker held the
            // host's users and showed no attendee (BUG-100).
            const attendeeType = apt.assigned_for?.entity_type?.toLowerCase();
            const meetingWithValue = attendeeType
                ? attendeeType === 'partner'
                : apt.meeting_with === 1 || apt.meeting_with_host === 1;
            setIsMeetingWithChecked(meetingWithValue);

            // Load selectable users with the correct meeting_with state
            if (apt.assigned_for) {
                try {
                    setLoadingAssignedFor(true);
                    const payload = {
                        [isHost ? 'meeting_with' : 'meeting_with_host']: meetingWithValue ? 1 : 0
                    };
                    const response = await fetchSelectableUsers(payload);
                    if (response.status) {
                        setSelectableUsers(response.data || []);
                    }

                    // NOW set the assigned_for data after users are loaded
                    const rawType = apt.assigned_for.entity_type || '';
                    const formattedType = rawType.toLowerCase();
                    setAssignedForType(formattedType);

                    setFormData(p => ({
                        ...p,
                        entity_id: apt.assigned_for.entity_id || apt.assigned_for.id,
                        assigned_for: apt.assigned_for.id,
                        entity_type: formattedType
                    }));

                    // Set Original Data for Comparison
                    setOriginalData({
                        subject: apt.subject,
                        category: apt.meeting_type || 'Business Review',
                        location: browserTimeZone(),
                        description: apt.description || "",
                        date: localDateString(start),
                        timeStart: hh_mm_full,
                        timeEnd: hh_mm_end_full,
                        entity_id: apt.assigned_for.entity_id || apt.assigned_for.id,
                        assigned_for: apt.assigned_for.id,
                        entity_type: formattedType
                    });
                } catch (error) {
                    console.error("Failed to load selectable users", error);
                } finally {
                    setLoadingAssignedFor(false);
                }
            }
        } catch (error) {
            console.error("Failed to fetch details", error);
        } finally {
            setLoadingDetails(false);
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

        // Fetch description
        const descVal = formData.description;

        const startDateTime = new Date(`${formData.date}T${formData.timeStart}`);
        // An end at or before the start is on the next day (R2 BUG-024).
        const durationMinutes = minutesBetween(formData.timeStart, formData.timeEnd);

        if (!formData.date) {
            setFormErrors({ appointment_date: "Event date is required" });
            return;
        }

        // Check for conflicts before submission - asked afresh: the background
        // check runs 500ms after a change, so a quick Save went out before it
        // answered and the conflict showed beside "updated successfully" (BUG-100).
        let conflicts = availabilityConflicts;
        if (attendees.length > 0 && !editingCalendlyMeeting) {
            try {
                const response = await checkAvailability(availabilityRequest());
                setAttendeeConflicts(response.data?.attendee_conflicts || []);
                conflicts = (response.data?.creator_conflicts || []).length > 0 ? response.data : null;
                setAvailabilityConflicts(conflicts);
            } catch (error) {
                // The server takes the booking either way; go on with what is known.
            }
        }
        if (conflicts && (conflicts.creator_conflicts || []).length > 0) {
            const allConflicts = [...(conflicts.creator_conflicts || [])];
            const matchingConflict = allConflicts.find(c => {
                const cStart = c.start_time || "";
                const cEnd = c.end_time || "";
                const isOverlap = (formData.timeStart < cEnd && endWithinDay(formData.timeStart, formData.timeEnd) > cStart);
                const isSelf = !isNewEvent && String(c.id) === String(selectedEventId);
                return isOverlap && !isSelf;
            });

            if (matchingConflict) {
                toast.error('Cannot save appointment: Time slot conflicts with another appointment');
                setLastConflictingAttempt({
                    attemptedStart: formData.timeStart,
                    attemptedEnd: formData.timeEnd,
                    conflict: matchingConflict
                });
                setIsConflictVisible(true);
                return;
            }
        }

        // FIXED PAYLOAD as requested
        const payload = {
            subject: formData.subject,
            description: descVal,
            appointment_date: toMySQLDate(startDateTime),
            timezone: formData.location,
            duration_minutes: durationMinutes,
            meeting_type: formData.category,
            [isHost ? 'meeting_with' : 'meeting_with_host']: isMeetingWithChecked ? 1 : 0,
            attendees,
            ...(isNewEvent && calendlyBooking.sync ? {
                sync_with_calendly: true,
                calendly_event_type_uri: calendlyBooking.eventTypeUri,
                calendly_use_title: calendlyBooking.useTitle,
                calendly_location_kind: calendlyBooking.locationKind || null,
                calendly_location: calendlyBooking.location || null,
            } : {}),
        };

        // The invitee only moves the meeting: who it is with stays as booked.
        if (isInvitee) {
            delete payload.attendees;
            delete payload[isHost ? 'meeting_with' : 'meeting_with_host'];
            payload.assigned_for = displayData.assignedForUserId;
        }
        // Calendly owns a Calendly meeting's people and time (changed with Reschedule).
        if (editingCalendlyMeeting) {
            delete payload.attendees;
            delete payload.appointment_date;
            delete payload.duration_minutes;
            delete payload.timezone;
            if (displayData.assignedForUserId) payload.assigned_for = displayData.assignedForUserId;
        }

        try {
            setIsSubmitting(true);
            let response;
            if (selectedEventId && !isNewEvent) {
                response = await updateAppointment(selectedEventId, payload);
            } else {
                response = await createAppointment(payload);
            }

            if (response && response.status) {
                toast.success(response.message || `Appointment ${isNewEvent ? 'created' : 'updated'} successfully`);
                if (modalInstance) modalInstance.hide();
                if (onSuccess) onSuccess();
            } else {
                toast.error(response?.message || `Failed to ${isNewEvent ? 'create' : 'update'} appointment`);
            }
        } catch (error) {
            if (error.response?.data?.errors) {
                setFormErrors(error.response.data.errors);
            } else if (error.response?.status !== 403) {
                toast.error(error.response?.data?.message || 'Failed to save appointment');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleConfirmClose = () => {
        setShowDeleteConfirm(false);
        if (modalInstance) modalInstance.show();
    };

    const confirmDelete = () => {
        if (!selectedEventId) return;
        if (modalInstance) modalInstance.hide();
        setShowDeleteConfirm(true);
    };

    const updateStatus = async (status) => {
        try {
            setIsUpdatingStatus(true);
            const response = await updateAppointment(selectedEventId, {
                assigned_for: displayData.assignedForUserId,
                status,
            });
            if (response && response.status) {
                toast.success(response.message || "Appointment updated successfully");
                askingCancelRef.current = false;
                setShowCancelConfirm(false);
                if (modalInstance) modalInstance.hide();
                if (onSuccess) onSuccess();
            } else {
                toast.error(response?.message || "Failed to update appointment");
            }
        } catch (error) {
            if (error.response?.status !== 403) {
                toast.error(error.response?.data?.message || "Failed to update appointment");
            }
        } finally {
            setIsUpdatingStatus(false);
        }
    };

    const confirmCancel = () => {
        if (!selectedEventId) return;
        if (modalInstance) modalInstance.hide();
        askingCancelRef.current = true;
        setShowCancelConfirm(true);
    };

    const handleCancelConfirmClose = () => {
        setShowCancelConfirm(false);
        if (!askingCancelRef.current) return;
        askingCancelRef.current = false;
        if (modalInstance) modalInstance.show();
    };

    const handleDelete = async () => {
        try {
            setIsDeleting(true);
            const response = await deleteAppointment(selectedEventId);
            if (response && response.status) {
                toast.success(response.message || "Appointment deleted successfully");
                setShowDeleteConfirm(false);
                if (modalInstance) modalInstance.hide();
                if (onSuccess) onSuccess();
            } else {
                toast.error(response?.message || "Failed to delete appointment");
            }
        } catch (error) {
            if (error.response?.status !== 403) {
                toast.error(error.response?.data?.message || "Failed to delete appointment");
            }
        } finally {
            setIsDeleting(false);
        }
    };




    // Use global Summernote hook
    const { editorRef: descriptionRef } = useSummernote('description', formData.description, (e) => {
        const { value } = e.target;
        setFormData(prev => ({
            ...prev,
            description: value
        }));
    }, {
        height: 150,
        placeholder: 'Enter description here...',
        dialogsInBody: true
    }, !viewMode); // Pass !viewMode as the enabled state

    const attendeeOptions = selectableUsers.map(u => ({ label: u.name, user_id: Number(u.id) }));

    return (
        <>
            <div className="modal fade appointment-modal-theme" id="appointmentModal" ref={eventModalRef} tabIndex="-1" aria-hidden="true">
                <div className="modal-dialog modal-dialog-centered modal-lg appointment-modal-dialog">
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
                                loadingDetails ? (
                                    <div className="event-details-skeleton">
                                        <div className="mb-4">
                                            <Skeleton width="120px" height="12px" className="mb-2" />
                                            <Skeleton width="70%" height="28px" />
                                        </div>
                                        <div className="mb-4">
                                            <Skeleton width="100px" height="12px" className="mb-2" />
                                            <div className="bg-light-subtle rounded-3 p-3 border border-light-subtle">
                                                <Skeleton width="100%" height="14px" className="mb-2" />
                                                <Skeleton width="90%" height="14px" className="mb-2" />
                                                <Skeleton width="40%" height="14px" />
                                            </div>
                                        </div>
                                        <div className="row g-4 mb-4">
                                            {[1, 2, 3, 4].map(i => (
                                                <div className="col-md-6" key={i}>
                                                    <div className="d-flex align-items-center">
                                                        <Skeleton shape="circle" size="32px" className="me-3" />
                                                        <div className="flex-grow-1">
                                                            <Skeleton width="60px" height="10px" className="mb-2" />
                                                            <Skeleton width="100px" height="14px" />
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="mt-4 p-3 rounded-3 bg-primary-subtle border border-primary-subtle d-flex align-items-center">
                                            <Skeleton shape="circle" size="60px" className="me-3" />
                                            <div className="flex-grow-1">
                                                <Skeleton width="80px" height="10px" className="mb-2" />
                                                <Skeleton width="150px" height="18px" />
                                            </div>
                                        </div>
                                        <div className="mt-4 pt-3 border-top d-flex justify-content-end gap-2">
                                            <Skeleton width="80px" height="35px" borderRadius="4px" />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="event-details position-relative">
                                        <div className="d-flex justify-content-end mb-3" style={{ position: 'absolute', right: '5px', top: '-10px', zIndex: 1 }}>
                                            {(canUpdate && (isScheduler || isInvitee)) && (
                                                <button
                                                    className="btn btn-sm btn-soft-primary d-flex align-items-center px-3 shadow-none"
                                                    onClick={() => setViewMode(false)}
                                                    style={{
                                                        fontWeight: "600",
                                                        transition: "all 0.2s ease"
                                                    }}
                                                >
                                                    {isInvitee ? (
                                                        <><i className="ri-calendar-schedule-line fs-14 me-1"></i> Reschedule</>
                                                    ) : (
                                                        <><i className="ri-pencil-fill fs-14 me-1"></i> Edit</>
                                                    )}
                                                </button>
                                            )}
                                        </div>

                                        <div className="mb-4">
                                            <div className="d-flex align-items-center justify-content-between mb-1">
                                                <label className="text-muted fs-11 text-uppercase fw-bold mb-0 letter-spacing-1">Appointment Title</label>
                                            </div>
                                            <h4 className="fw-bold mb-1 text-dark">{displayData.title || "No Title"}</h4>
                                        </div>

                                        <div className="mb-4">
                                            <label className="text-muted fs-11 text-uppercase fw-bold mb-2 d-block letter-spacing-1">Description</label>
                                            <div className="bg-light-subtle rounded-3 p-3 border border-light-subtle">
                                                <div className="text-dark fs-14" style={{ lineHeight: "1.7", letterSpacing: "0.2px" }}>
                                                    {(() => {
                                                        const description = displayData.description || "No Description";
                                                        // Extract text and properly decode common entities for the preview
                                                        const rawText = description
                                                            .replace(/<[^>]*>/g, '')
                                                            .replace(/&nbsp;/g, ' ')
                                                            .replace(/&amp;/g, '&')
                                                            .replace(/&lt;/g, '<')
                                                            .replace(/&gt;/g, '>')
                                                            .replace(/&quot;/g, '"');

                                                        const limit = 180;

                                                        if (!isDescriptionExpanded && rawText.length > limit) {
                                                            return (
                                                                <div className="description-content">
                                                                    {rawText.substring(0, limit)}...
                                                                    <button
                                                                        type="button"
                                                                        className="btn btn-link p-0 ms-2 fs-12 fw-bold text-primary text-decoration-none shadow-none text-uppercase"
                                                                        onClick={() => setIsDescriptionExpanded(true)}
                                                                    >
                                                                        See more <i className="ri-arrow-down-s-line align-middle"></i>
                                                                    </button>
                                                                </div>
                                                            );
                                                        }

                                                        return (
                                                            <div className="description-content">
                                                                <div
                                                                    className="rich-text-content"
                                                                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(description) }}
                                                                ></div>
                                                                {isDescriptionExpanded && rawText.length > limit && (
                                                                    <button
                                                                        type="button"
                                                                        className="btn btn-link p-0 mt-2 fs-12 fw-bold text-primary text-decoration-none shadow-none text-uppercase"
                                                                        onClick={() => setIsDescriptionExpanded(false)}
                                                                    >
                                                                        See less <i className="ri-arrow-up-s-line align-middle"></i>
                                                                    </button>
                                                                )}
                                                            </div>
                                                        );
                                                    })()}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="row g-4 mb-2">
                                            <DetailItem icon="ri-calendar-event-line" label="Date" value={displayData.date} className="detail-item-col" />
                                            <DetailItem icon="ri-time-line" label="Time Slot" value={`${displayData.timeStart} - ${displayData.timeEnd}`} className="detail-item-col" />
                                            <DetailItem icon="ri-map-pin-line" label="Time Zone" value={displayData.location} className="detail-item-col" />
                                            <DetailItem icon="ri-user-star-line" label="Scheduled By" value={displayData.scheduledBy} className="detail-item-col" />
                                        </div>

                                        <div className="mt-4 p-3 rounded-3 bg-primary-subtle border border-primary-subtle d-flex align-items-center">
                                            <div className="flex-shrink-0 me-3">
                                                <div className="avatar-md">
                                                    {displayData.assignedForAvatar ? (
                                                        <img src={displayData.assignedForAvatar} alt="" className="rounded-circle img-thumbnail avatar-title" style={{ width: '60px', height: '60px', objectFit: 'cover' }} />
                                                    ) : (
                                                        <div className="avatar-title rounded-circle bg-primary text-white">
                                                            <i className="ri-user-follow-line fs-24"></i>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex-grow-1 d-flex align-items-center gap-2">
                                                <p className="text-primary-emphasis mb-0 fs-12 uppercase-label">
                                                    Appointment With:
                                                </p>

                                                <h5 className="mb-0 fs-16 fw-bold">
                                                    {displayData.attendees.length > 1 ? (
                                                        <span className="text-dark">{displayData.attendees.map(a => a.name || a.email).join(', ')}</span>
                                                    ) : displayData.attendees.length === 1 && !displayData.attendees[0].user_id ? (
                                                        <span className="text-dark">{displayData.attendees[0].name || displayData.attendees[0].email}</span>
                                                    ) : displayData.assignedForType ? (
                                                        <a
                                                            href={`/${getShortType(displayData.assignedForType)}/${displayData.assignedForId}`}
                                                            className="text-primary text-decoration-none hover-primary"
                                                        >
                                                            {displayData.assignedFor}
                                                        </a>
                                                    ) : (
                                                        <span className="text-dark">{displayData.assignedFor}</span>
                                                    )}
                                                </h5>

                                            </div>
                                        </div>

                                        {displayData.isCalendly && (
                                            <div className="mt-3 d-flex align-items-center gap-3 fs-13">
                                                <span className="badge bg-primary-subtle text-primary">Calendly</span>
                                                {displayData.joinUrl && (
                                                    <a href={displayData.joinUrl} target="_blank" rel="noopener noreferrer"><i className="ri-vidicon-line me-1"></i>Join</a>
                                                )}
                                                {displayData.rescheduleUrl && !displayData.isPast && displayData.status !== APPOINTMENT_STATUS.CANCELLED && (
                                                    <a href={displayData.rescheduleUrl} target="_blank" rel="noopener noreferrer"><i className="ri-calendar-schedule-line me-1"></i>Reschedule</a>
                                                )}
                                            </div>
                                        )}

                                        {displayData.hadConflict && (
                                            <div className="alert alert-warning d-flex align-items-start gap-2 py-2 px-3 mt-3 mb-0 fs-13" role="note">
                                                <i className="ri-error-warning-line fs-16"></i>
                                                <span>This meeting was booked at a time you already had another appointment. Check your calendar for the overlap.</span>
                                            </div>
                                        )}
                                        {!displayData.isCalendly && isScheduler && !displayData.isPast && isOpenStatus && selectedEventId && (
                                            <div className="mt-3">
                                                <AddToCalendly
                                                    appointmentId={selectedEventId}
                                                    attendees={toAttendeeInputs(displayData.attendees)}
                                                    onAdded={() => { fetchDetails(selectedEventId); if (onSuccess) onSuccess(); }}
                                                />
                                            </div>
                                        )}

                                        <div className="mt-4 pt-3 border-top d-flex justify-content-end gap-2">
                                            {(hasPermission('delete appointments') && isScheduler) && (
                                                <button className="btn btn-soft-danger fw-medium" onClick={confirmDelete} disabled={isDeleting}>
                                                    <i className="ri-delete-bin-line me-1"></i> {isDeleting ? "Deleting..." : "Delete"}
                                                </button>
                                            )}
                                            {canCancel && (
                                                <button className="btn btn-soft-danger fw-medium" onClick={confirmCancel} disabled={isUpdatingStatus}>
                                                    <i className="ri-close-circle-line me-1"></i> Cancel Appointment
                                                </button>
                                            )}
                                            {canConfirm && (
                                                <button className="btn btn-success fw-medium" onClick={() => updateStatus(APPOINTMENT_STATUS.CONFIRMED)} disabled={isUpdatingStatus}>
                                                    <i className="ri-check-line me-1"></i> Confirm
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )
                            ) : (
                                /* Form View */
                                <form onSubmit={handleSubmit}>

                                    <div className="row">

                                        <div className="col-md-8 mb-3">
                                            <label className="form-label">Appointment Title <span className="text-danger">*</span></label>
                                            <input type="text" className={`form-control ${formErrors.subject ? "is-invalid" : ""}`}
                                                value={formData.subject} onChange={(e) => setFormData(p => ({ ...p, subject: e.target.value }))} placeholder="Enter appointment title" />
                                            {formErrors.subject && <div className="invalid-feedback">{formErrors.subject}</div>}
                                        </div>

                                        <div className="col-md-4 mb-3">
                                            <label className="form-label">Type <span className="text-danger">*</span></label>
                                            <Dropdown value={formData.category} options={APPOINTMENT_TYPE_OPTIONS}
                                                onChange={(e) => setFormData(p => ({ ...p, category: e.value }))}
                                                className={`w-100 ${formErrors.meeting_type ? 'p-invalid' : ''}`}
                                                placeholder="Select Type" appendTo="self" />
                                            {formErrors.meeting_type && <div className="text-danger fs-11 mt-1">{formErrors.meeting_type}</div>}
                                        </div>

                                        {/* The invitee cannot change who the meeting is with (BUG-102). */}
                                        {!isInvitee && (
                                        <div className="col-12 mb-3">
                                            <div className="d-flex align-items-center justify-content-between mb-2 mt-1">
                                                <label className="form-label mb-0">
                                                    {isHost ? "Appointment With" : "Appointment With"} <span className="text-danger">*</span>
                                                </label>
                                                {(!isHost || (isHost && hostEntityId == currentUser?.partner_id)) && (
                                                    <div className="form-check">
                                                        <input
                                                            className="form-check-input"
                                                            type="checkbox"
                                                            id="meeting-with-toggle"
                                                            checked={isMeetingWithChecked}
                                                            onChange={(e) => setIsMeetingWithChecked(e.target.checked)}
                                                            name={isHost ? "meeting_with" : "meeting_with_host"}
                                                            value="1"
                                                        />
                                                        <label className="form-check-label ms-1" htmlFor="meeting-with-toggle">
                                                            {isHost ? "Meeting with partner" : "Meeting with host"}
                                                        </label>
                                                    </div>
                                                )}
                                            </div>

                                            <AttendeePicker
                                                options={attendeeOptions}
                                                value={attendees}
                                                onChange={setAttendees}
                                                conflicts={attendeeConflicts}
                                                errors={formErrors}
                                                loading={loadingAssignedFor}
                                                disabled={editingCalendlyMeeting}
                                            />
                                            {formErrors.assigned_for && <div className="text-danger fs-11 mt-1">{formErrors.assigned_for}</div>}
                                            {editingCalendlyMeeting && (
                                                <div className="text-muted fs-11 mt-1">This meeting is in Calendly: its people and time are changed there (Reschedule).</div>
                                            )}
                                            {isNewEvent && attendees.length > 0 && (
                                                <div className="mt-2">
                                                    <CalendlyBookingFields
                                                        attendees={attendees}
                                                        date={formData.date}
                                                        timezone={formData.location}
                                                        value={calendlyBooking}
                                                        onChange={setCalendlyBooking}
                                                        onPickTime={(time, minutes) => setFormData(p => ({ ...p, timeStart: time, timeEnd: timeAfter(time, minutes) }))} onCalendlyFit={setCalendlyFit}
                                                        selectedTime={formData.timeStart}
                                                        errors={formErrors}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                        )}

                                        <div className="col-12 position-relative px-0 mb-2" style={{ minHeight: '38px' }}>
                                            <div className="row mx-0">
                                                <div className="col-md-6 col-12 mb-3 px-2">
                                                    <label className="form-label fs-13 fw-semibold">Event Date <span className="text-danger">*</span></label>
                                                    <div className="custom-datepicker">
                                                        <Calendar
                                                            value={parseDate(formData.date)}
                                                            onChange={(e) => {
                                                                const date = e.value;
                                                                const dateString = date
                                                                    ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
                                                                    : "";
                                                                setFormData(prev => {
                                                                    const open = startSlotsFrom(TIME_SLOTS, dateString);
                                                                    if (!dateString || open.some(slot => slot.value === prev.timeStart)) return { ...prev, date: dateString };
                                                                    // That time has passed today: move to the next one still ahead.
                                                                    const next = open[0]?.value ?? prev.timeStart;
                                                                    return { ...prev, date: dateString, timeStart: next, timeEnd: timeAfter(next) };
                                                                });
                                                            }}
                                                            minDate={new Date()}
                                                            dateFormat="yy-mm-dd"
                                                            placeholder="Select date"
                                                            showIcon
                                                            className="w-100"
                                                            appendTo="self"
                                                            readOnlyInput
                                                        />
                                                        {formErrors.appointment_date && <div className="text-danger mt-1" style={{ fontSize: '10px' }}>{formErrors.appointment_date}</div>}
                                                    </div>
                                                </div>
                                                <div className="col-md-6 col-12 mb-3 px-2">
                                                    <label className="form-label fs-13 fw-semibold">Time Slot <span className="text-danger">*</span></label>
                                                    <div className="d-flex align-items-center gap-2 time-slot-container">
                                                        <Dropdown value={formData.timeStart} options={startOptions}
                                                            onChange={(e) => {
                                                                const startVal = e.value;
                                                                // Half an hour later, past midnight too (R2 BUG-024).
                                                                setFormData(p => ({ ...p, timeStart: startVal, timeEnd: timeAfter(startVal) }));
                                                            }}
                                                            className="flex-grow-1" placeholder="Start" appendTo="self" />
                                                        <span className="text-muted fw-bold">to</span>
                                                        <Dropdown value={formData.timeEnd}
                                                            options={endSlotsAfter(TIME_SLOTS, formData.timeStart)}
                                                            onChange={(e) => {
                                                                setFormData(p => ({ ...p, timeEnd: e.value }));
                                                            }}
                                                            className={`flex-grow-1 ${formErrors.duration_minutes ? 'p-invalid' : ''}`} placeholder="End" appendTo="self" />
                                                    </div>
                                                    {timeSlotError && <div className="text-danger fs-11 mt-1">{timeSlotError}</div>}
                                                    {isNewEvent && calendlyBooking.sync && calendlyFit.open === false && (
                                                        <div className="text-warning fs-11 mt-1 d-flex align-items-start gap-1">
                                                            <i className="ri-error-warning-line"></i>
                                                            <span>Not an open time in your Calendly - Calendly will refuse it. Pick one of the open times above.</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Availability Alert - Animated Collapse */}
                                        <div className="col-12 px-2 overflow-hidden"
                                            style={{ transition: 'all 0.4s ease', maxHeight: isConflictVisible && (availabilityConflicts || lastConflictingAttempt) ? '200px' : '0', opacity: isConflictVisible ? 1 : 0, marginBottom: isConflictVisible && (availabilityConflicts || lastConflictingAttempt) ? '1rem' : '0' }}>
                                            {(availabilityConflicts || lastConflictingAttempt) && (
                                                <div className="alert alert-danger-subtle border border-danger-subtle d-flex align-items-center mb-0 py-2 position-relative" role="alert">
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

                                        {/* The clash check runs quietly - no loading placeholder; only a clash shows (above). */}

                                        <div className="col-12 mb-3">
                                            <label className="form-label fs-13 fw-semibold" htmlFor="appointment-time-zone">Time Zone</label>
                                            <input id="appointment-time-zone" type="text" readOnly
                                                className={`form-control ${formErrors.timezone ? 'is-invalid' : ''}`}
                                                value={timeZoneLabel(formData.location)} />
                                            <div className="text-muted fs-11 mt-1">Times are booked and shown in your time zone.</div>
                                            {formErrors.timezone && <div className="text-danger fs-11 mt-1">{formErrors.timezone}</div>}
                                        </div>

                                        <div className="col-12 mb-3">
                                            <label className="form-label fs-13 fw-semibold">Description</label>
                                            <div ref={descriptionRef}></div>
                                        </div>
                                    </div>

                                    <div className="hstack gap-2 justify-content-end mt-4 pt-3 border-top">
                                        <button type="button" className="btn btn-light" onClick={handleCancel}>Cancel</button>
                                        {((isNewEvent && hasPermission('create appointments')) || (!isNewEvent && hasPermission('update appointments'))) && (
                                            <button type="submit" className="btn btn-primary"
                                                disabled={isSubmitting || isCheckingAvailability || isConflictVisible}>
                                                {isSubmitting ? (
                                                    <>
                                                        <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                                                        Loading...
                                                    </>
                                                ) : (
                                                    <>
                                                        <i className={`${isNewEvent ? 'ri-add-line' : 'ri-save-line'} me-1 align-middle`}></i>
                                                        {isNewEvent ? "Confirm Appointment" : "Save Changes"}
                                                    </>
                                                )}
                                            </button>
                                        )}
                                    </div>
                                </form>
                            )}
                        </div>
                    </div>
                </div>

            </div >
            <DeleteConfirmationModal
                show={showDeleteConfirm}
                onConfirm={handleDelete}
                onClose={handleConfirmClose}
                loading={isDeleting}
                text="Are you sure you want to delete this appointment? This action cannot be undone."
            />
            <ConfirmationModal
                show={showCancelConfirm}
                onHide={handleCancelConfirmClose}
                onConfirm={() => updateStatus(APPOINTMENT_STATUS.CANCELLED)}
                loading={isUpdatingStatus}
                title="Cancel this appointment?"
                message="The person who booked it will see it as cancelled."
                confirmText="Yes, cancel it"
                variant="danger"
            />
        </>
    );
});

const DetailItem = ({ icon, label, value, className }) => (
    <div className={`col-md-6 ${className || ''}`}>
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
                <h6 className="mb-0 fs-14 fw-bold text-dark">{value}</h6>
            </div>
        </div>
    </div>
);

export default AppointmentModal;
